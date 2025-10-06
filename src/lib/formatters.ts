/**
 * Biblioteca de formatação de dados
 * Funções para formatar CPF, CNPJ, telefone, CEP, moeda, etc.
 */

/**
 * Formata CPF: 000.000.000-00
 */
export const formatCPF = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 11);
  
  return limited
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export const formatCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 14);
  
  return limited
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

/**
 * Formata CPF ou CNPJ automaticamente
 */
export const formatDocument = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.length <= 11 ? formatCPF(value) : formatCNPJ(value);
};

/**
 * Formata telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 11);
  
  if (limited.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return limited
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  } else {
    // Celular: (00) 00000-0000
    return limited
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
  }
};

/**
 * Formata CEP: 00000-000
 */
export const formatCEP = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 8);
  
  return limited.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
};

/**
 * Formata RG: 00.000.000-0
 */
export const formatRG = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const limited = cleaned.slice(0, 9);
  
  return limited
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1})$/, '$1-$2');
};

/**
 * Formata valor em Real Brasileiro: R$ 1.234,56
 */
export const formatCurrency = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) / 100 : value;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue || 0);
};

/**
 * Formata input de moeda conforme o usuário digita
 */
export const formatCurrencyInput = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const numValue = parseFloat(cleaned) / 100;
  
  if (isNaN(numValue)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
};

/**
 * Remove formatação e retorna apenas números
 */
export const unformatValue = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Converte string de moeda para número
 */
export const currencyToNumber = (value: string): number => {
  const cleaned = value.replace(/\D/g, '');
  return parseFloat(cleaned) / 100;
};

/**
 * Formata percentual: 12,34%
 */
export const formatPercentage = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(2).replace('.', ',')}%`;
};

/**
 * Formata data: DD/MM/YYYY
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(dateObj);
};

/**
 * Formata data e hora: DD/MM/YYYY HH:mm
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dateObj);
};
