import RegisterForm from "../components/forms/RegisterForm";

export function RegisterPage() {
  return (
    <div className="container mx-auto flex items-center justify-center lg:justify-end min-h-[calc(100vh-200px)]">
      <div className="w-full h-full max-w-md border-none">
        <p className="text-4xl font-bold">Register for full access</p>
        <p className="text-base leading-relaxed">
          To access all of Autophon's many features, you must first create a
          free account. This protects your data, minimizes attacks by web-bots,
          and helps us collect usage numbers for our funders.
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}
