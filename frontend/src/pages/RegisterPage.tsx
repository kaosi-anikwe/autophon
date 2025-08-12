import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import RegisterForm from '../components/forms/RegisterForm'

export function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Sign up to access advanced features and increased limits.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  )
}