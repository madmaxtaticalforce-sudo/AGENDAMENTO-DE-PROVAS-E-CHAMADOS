import { describe, it, expect } from 'vitest';
import { maskCPF, maskPhone, getSubject } from './helpers';

describe('Helpers', () => {
  it('should mask CPF correctly', () => {
    expect(maskCPF('12345678901')).toBe('123.456.789-01');
  });

  it('should mask Phone correctly', () => {
    expect(maskPhone('71983149916')).toBe('(71) 98314-9916');
  });

  it('should generate correct subject', () => {
    const app = {
      fullName: 'João Silva',
      examType: 'Prova de Rua',
      renach: 'BA123456789'
    };
    expect(getSubject(app)).toBe('PROVA DE RUA - BA123456789 JOÃO');
  });
});
