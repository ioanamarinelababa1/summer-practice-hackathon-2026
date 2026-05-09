export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 px-4">
      {children}
    </div>
  )
}
