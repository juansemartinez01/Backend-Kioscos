import { DataSource, EntityManager, Repository } from 'typeorm';
import { crearProxyDeRepositorio } from './tenant-repository.provider';
import { TenantContextService } from './tenant-context.service';

class Venta {}

/**
 * Lo que se prueba acá es la propiedad que sostiene todo el diseño: el proxy
 * resuelve el manager EN CADA LLAMADA, no al construirse.
 *
 * Si alguien lo "optimiza" cacheando el repositorio, estos tests fallan — y con
 * razón: un repo cacheado quedaría pegado al manager del primer request que lo
 * tocó, o sea al tenant de ese request. Todos los demás leerían sus datos.
 */
describe('crearProxyDeRepositorio', () => {
  const repoDeTransaccion = { find: jest.fn() } as unknown as Repository<Venta>;
  const repoGlobal = { find: jest.fn() } as unknown as Repository<Venta>;

  const managerDeTransaccion = {
    getRepository: jest.fn(() => repoDeTransaccion),
  } as unknown as EntityManager;

  const dataSource = {
    manager: { getRepository: jest.fn(() => repoGlobal) },
  } as unknown as DataSource;

  let tenantContext: TenantContextService;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContext = new TenantContextService();
  });

  it('usa el manager de la transaccion cuando hay contexto de tenant', () => {
    const proxy = crearProxyDeRepositorio(Venta, tenantContext, dataSource);

    tenantContext.run({ tenantId: 7, manager: managerDeTransaccion }, () => {
      void proxy.find();
    });

    expect(managerDeTransaccion.getRepository).toHaveBeenCalledWith(Venta);
    expect(dataSource.manager.getRepository).not.toHaveBeenCalled();
  });

  it('cae al manager global cuando no hay contexto', () => {
    const proxy = crearProxyDeRepositorio(Venta, tenantContext, dataSource);

    void proxy.find();

    // El manager global no tiene app.tenant_id, asi que RLS no le devuelve
    // filas. Falla cerrado.
    expect(dataSource.manager.getRepository).toHaveBeenCalledWith(Venta);
  });

  it('resuelve por llamada: dos requests distintos no comparten repositorio', () => {
    const proxy = crearProxyDeRepositorio(Venta, tenantContext, dataSource);

    const otroRepo = { find: jest.fn() } as unknown as Repository<Venta>;
    const otroManager = {
      getRepository: jest.fn(() => otroRepo),
    } as unknown as EntityManager;

    tenantContext.run({ tenantId: 1, manager: managerDeTransaccion }, () => {
      void proxy.find();
    });
    tenantContext.run({ tenantId: 2, manager: otroManager }, () => {
      void proxy.find();
    });

    expect(managerDeTransaccion.getRepository).toHaveBeenCalledTimes(1);
    expect(otroManager.getRepository).toHaveBeenCalledTimes(1);
  });

  it('no filtra el contexto de un tenant al codigo de afuera', () => {
    const proxy = crearProxyDeRepositorio(Venta, tenantContext, dataSource);

    tenantContext.run({ tenantId: 42, manager: managerDeTransaccion }, () => {
      expect(tenantContext.getTenantId()).toBe(42);
    });

    expect(tenantContext.getTenantId()).toBeNull();
    void proxy.find();
    expect(dataSource.manager.getRepository).toHaveBeenCalledWith(Venta);
  });
});
