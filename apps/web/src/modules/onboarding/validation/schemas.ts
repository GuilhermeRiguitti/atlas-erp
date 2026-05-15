import * as yup from "yup";

export const tenantOnboardingSchema = yup.object({
  token: yup.string().trim().required("Token de onboarding obrigatorio"),
  tenant: yup.object({
    legalName: yup.string().trim().min(3, "Informe uma razao social valida").required("Razao social obrigatoria"),
    tradeName: yup.string().trim().optional(),
    cnpj: yup.string().matches(/^(\D*\d\D*){14}$/, "CNPJ deve ter 14 digitos").required("CNPJ obrigatorio"),
    contactEmail: yup.string().email("Email fiscal invalido").required("Email fiscal obrigatorio"),
    contactPhone: yup.string().trim().optional(),
    addressStreet: yup.string().trim().required("Logradouro obrigatorio"),
    addressNumber: yup.string().trim().required("Numero obrigatorio"),
    addressNeighborhood: yup.string().trim().required("Bairro obrigatorio"),
    addressCity: yup.string().trim().required("Cidade obrigatoria"),
    addressState: yup.string().trim().length(2, "UF deve ter 2 letras").required("UF obrigatoria"),
    addressCityIbgeCode: yup.string().matches(/^\d{7}$/, "Codigo IBGE deve ter 7 digitos").required("Codigo IBGE obrigatorio"),
    addressZipCode: yup.string().matches(/^(\D*\d\D*){8}$/, "CEP deve ter 8 digitos").required("CEP obrigatorio"),
  }),
  titular: yup.object({
    title: yup.string().trim().optional(),
    ownershipPercentage: yup
      .number()
      .typeError("Participacao deve ser numerica")
      .min(0, "Participacao nao pode ser negativa")
      .max(100, "Participacao nao pode passar de 100")
      .optional(),
  }),
});

export async function validateOnboarding(value: object) {
  try {
    await tenantOnboardingSchema.validate(value, { abortEarly: false });
    return null;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return error.errors.join(", ");
    }

    return "Formulario invalido";
  }
}
