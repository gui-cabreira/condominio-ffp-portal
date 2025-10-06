/**
 * Biblioteca de máscaras para inputs
 * Funções que aplicam máscaras conforme o usuário digita
 */

export type MaskFunction = (value: string) => string;

/**
 * Cria máscara genérica baseada em padrão
 * Exemplo: createMask('###.###.###-##') para CPF
 */
export const createMask = (pattern: string, placeholder = '#'): MaskFunction => {
  return (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let masked = '';
    let valueIndex = 0;
    
    for (let i = 0; i < pattern.length && valueIndex < cleaned.length; i++) {
      if (pattern[i] === placeholder) {
        masked += cleaned[valueIndex];
        valueIndex++;
      } else {
        masked += pattern[i];
      }
    }
    
    return masked;
  };
};

/**
 * Máscara de CPF: 000.000.000-00
 */
export const cpfMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 11);
  
  return limited
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

/**
 * Máscara de CNPJ: 00.000.000/0000-00
 */
export const cnpjMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 14);
  
  return limited
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

/**
 * Máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export const phoneMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 11);
  
  if (limited.length <= 10) {
    return limited
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  } else {
    return limited
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }
};

/**
 * Máscara de CEP: 00000-000
 */
export const cepMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 8);
  
  return limited.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
};

/**
 * Máscara de RG: 00.000.000-0
 */
export const rgMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 9);
  
  return limited
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1})$/, '$1-$2');
};

/**
 * Máscara de data: DD/MM/YYYY
 */
export const dateMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 8);
  
  return limited
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d{1,4})$/, '$1/$2');
};

/**
 * Máscara de hora: HH:MM
 */
export const timeMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 4);
  
  return limited.replace(/(\d{2})(\d{1,2})$/, '$1:$2');
};

/**
 * Máscara de moeda: R$ 1.234,56
 */
export const currencyMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const numValue = parseFloat(cleaned) / 100;
  
  if (isNaN(numValue)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

/**
 * Máscara de percentual: 00,00%
 */
export const percentageMask: MaskFunction = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 5); // Máximo 100.00%
  
  if (limited.length === 0) return '';
  if (limited.length === 1) return `0,0${limited}%`;
  if (limited.length === 2) return `0,${limited}%`;
  
  const intPart = limited.slice(0, -2);
  const decPart = limited.slice(-2);
  
  return `${intPart},${decPart}%`;
};

/**
 * Máscara apenas números
 */
export const onlyNumbers: MaskFunction = (value: string) => {
  return value.replace(/\D/g, '');
};

/**
 * Máscara apenas letras
 */
export const onlyLetters: MaskFunction = (value: string) => {
  return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
};

/**
 * Máscara de número com decimais (permite . e ,)
 */
export const decimalMask: MaskFunction = (value: string) => {
  return value.replace(/[^0-9.,]/g, '');
};
