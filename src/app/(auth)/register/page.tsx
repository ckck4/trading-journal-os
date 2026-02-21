import { RegisterForm } from "./register-form";

export const metadata = {
    title: "Register - Trading Journal OS",
};

export default function RegisterPage() {
    return (
        <div className="rounded-lg border border-[#1E2230] bg-[#14171E] p-8">
            <h1 className="mb-2 text-2xl font-semibold text-[#E8EAF0]">
                Create your account
            </h1>
            <p className="mb-6 text-sm text-[#8B92A8]">
                Start tracking your trading performance.
            </p>
            <RegisterForm />
            <p className="mt-6 text-center text-sm text-[#8B92A8]">
                Already have an account?{" "}
                <a href="/login" className="text-[#6C63FF] hover:text-[#7B73FF]">
                    Sign in
                </a>
            </p>
        </div>
    );
}
