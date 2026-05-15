import * as yup from "yup";

const optionalUrlish = yup.string().trim().optional();

export const tenantSchema = yup.object({
  legalName: yup.string().trim().min(3, "Informe uma razao social valida").required("Razao social obrigatoria"),
  tradeName: yup.string().trim().optional(),
  cnpj: yup.string().matches(/^(\D*\d\D*){14}$/, "CNPJ deve ter 14 digitos").required("CNPJ obrigatorio"),
  contactEmail: yup.string().email("Email fiscal invalido").required("Email fiscal obrigatorio"),
  addressStreet: yup.string().trim().required("Logradouro obrigatorio"),
  addressNumber: yup.string().trim().required("Numero obrigatorio"),
  addressNeighborhood: yup.string().trim().required("Bairro obrigatorio"),
  addressCity: yup.string().trim().required("Cidade obrigatoria"),
  addressState: yup.string().trim().length(2, "UF deve ter 2 letras").required("UF obrigatoria"),
  addressCityIbgeCode: yup.string().matches(/^\d{7}$/, "Codigo IBGE deve ter 7 digitos").required("Codigo IBGE obrigatorio"),
  addressZipCode: yup.string().matches(/^(\D*\d\D*){8}$/, "CEP deve ter 8 digitos").required("CEP obrigatorio"),
});

export const clientSchema = yup.object({
  name: yup.string().trim().min(2, "Informe o nome do cliente").required("Nome obrigatorio"),
  document: yup.string().matches(/^(\D*\d\D*){11}$|^(\D*\d\D*){14}$/, "Documento deve ter CPF ou CNPJ valido").required("Documento obrigatorio"),
  email: yup.string().trim().email("Email invalido").optional(),
  addressState: yup.string().trim().optional().test("uf", "UF deve ter 2 letras", (value) => !value || value.length === 2),
  addressZipCode: yup.string().trim().optional().test("cep", "CEP deve ter 8 digitos", (value) => !value || value.replace(/\D/g, "").length === 8),
  notes: yup.string().trim().optional(),
});

export const invoiceSchema = yup.object({
  borrowerName: yup.string().trim().min(2, "Informe o tomador").required("Tomador obrigatorio"),
  borrowerDocument: yup.string().matches(/^(\D*\d\D*){11}$|^(\D*\d\D*){14}$/, "Documento do tomador deve ser CPF ou CNPJ").required("Documento do tomador obrigatorio"),
  borrowerEmail: yup.string().trim().email("Email do tomador invalido").optional(),
  serviceDescription: yup.string().trim().min(10, "Descreva melhor o servico").required("Descricao do servico obrigatoria"),
  amount: yup.number().typeError("Valor deve ser numerico").positive("Valor deve ser maior que zero").required("Valor obrigatorio"),
  deductions: yup.number().typeError("Deducoes devem ser numericas").min(0, "Deducoes nao podem ser negativas").optional(),
  issRate: yup.number().typeError("Aliquota deve ser numerica").min(0, "Aliquota nao pode ser negativa").optional(),
});

export const fiscalCredentialSchema = yup.object({
  providerCompanyId: yup.string().trim().min(2, "Informe o ID da empresa no provider").required("ID da empresa no provider obrigatorio"),
  apiKey: yup.string().trim().optional().test("api-key", "A chave deve ter pelo menos 8 caracteres", (value) => !value || value.length >= 8),
});

export const userSchema = yup.object({
  name: yup.string().trim().min(2, "Informe o nome").required("Nome obrigatorio"),
  email: yup.string().email("Email invalido").required("Email obrigatorio"),
  password: yup.string().min(8, "Senha deve ter pelo menos 8 caracteres").optional(),
  website: optionalUrlish,
});

export async function validateForm<T extends object>(schema: yup.ObjectSchema<object>, value: T) {
  try {
    await schema.validate(value, { abortEarly: false });
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return error.errors.join(", ");
    }

    return "Formulario invalido";
  }
}
