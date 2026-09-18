import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Observable, from, throwError } from 'rxjs';
import { catchError, concatMap, finalize, map } from 'rxjs/operators';
import { DataSource, QueryRunner } from 'typeorm';
import { TenantContextService } from './tenant-context.service';

/**
 * Abre una transacción por request y le aplica `app.tenant_id`, que es lo que
 * leen las políticas de RLS.
 *
 * Tiene que ser `SET LOCAL` (o `set_config(..., true)`, que es lo mismo pero
 * acepta parámetros): eso ata el valor a la transacción. Si fuera `SET` a secas
 * quedaría pegado a la CONEXIÓN, y como la conexión vuelve al pool al terminar,
 * el próximo request la agarraría con el tenant del anterior. Ese error es
 * silencioso y sirve datos cruzados.
 *
 * COSTO A TENER EN CUENTA: cada request en vuelo retiene una conexión del pool
 * mientras dura. Con `db.t4g.micro` el margen es chico — hay que dimensionar el
 * pool y vigilar las rutas lentas (reportes, importación de productos).
 */
@Injectable()
export class TenantTransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContext: TenantContextService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const store = this.tenantContext.getStore();

    // Ruta pública: no hay tenant, no abrimos transacción.
    if (!store) return next.handle();

    return from(this.abrirTransaccion(store.tenantId)).pipe(
      concatMap((queryRunner) => {
        store.manager = queryRunner.manager;

        return next.handle().pipe(
          concatMap((data) =>
            from(queryRunner.commitTransaction()).pipe(map(() => data)),
          ),
          catchError((error: unknown) =>
            from(queryRunner.rollbackTransaction()).pipe(
              concatMap(() => throwError(() => error)),
            ),
          ),
          finalize(() => {
            store.manager = null;
            void queryRunner.release();
          }),
        );
      }),
    );
  }

  private async abrirTransaccion(tenantId: number): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // set_config con `is_local = true` == SET LOCAL, pero parametrizable.
    // SET LOCAL no acepta placeholders, así que esta es la forma segura.
    await queryRunner.query('SELECT set_config($1, $2, true)', [
      'app.tenant_id',
      String(tenantId),
    ]);

    return queryRunner;
  }
}
