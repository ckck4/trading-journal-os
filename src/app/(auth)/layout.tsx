export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0D0F14]">
            <div className="w-full max-w-md px-4">{children}</div>
        </div>
    );
}
