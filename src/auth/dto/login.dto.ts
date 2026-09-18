import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Idéntico al del proyecto viejo. El front no cambia una línea. */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
