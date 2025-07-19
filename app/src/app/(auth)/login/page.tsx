import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="max-w-md w-full space-y-8">
      <LoginForm />
    </div>
  );
}

export const metadata = {
  title: 'Login - Arc Board Management',
  description: 'Sign in to Arc Board Management System',
};
