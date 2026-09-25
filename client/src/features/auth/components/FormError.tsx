interface FormErrorProps {
  children: React.ReactNode;
}
export const FormError: React.FC<FormErrorProps> = ({ children }) => (
  <p className="auth-form-error" role="alert">
    {children}
  </p>
);
