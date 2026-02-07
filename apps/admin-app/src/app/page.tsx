export default function AdminPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold mb-8">Amieira Admin Portal</h1>
            <p className="text-gray-600 mb-8">Staff access only.</p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                Login with Staff Account
            </button>
        </div>
    );
}
