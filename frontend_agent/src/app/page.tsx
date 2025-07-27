'use client'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-white">🔍 Agent Summary Prototype</h1>

      <div className="space-y-4">
        <Link href="/dev-soc">
          <button className="bg-indigo-600 px-4 py-2 rounded text-white hover:bg-indigo-700">
            SOC & DEV
          </button>
        </Link>

        <Link href="/customer">
          <button className="bg-purple-600 px-4 py-2 rounded text-white hover:bg-purple-700 ml-4">
            CUSTOMER
          </button>
        </Link>

        <Link href="/customer-success">
          <button className="bg-teal-600 px-4 py-2 rounded text-white hover:bg-teal-700 ml-4">
            CUSTOMER SUCCESS
          </button>
        </Link>
      </div>
    </main>
  );
}