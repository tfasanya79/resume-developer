export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xl">CV Builder</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="#features" className="text-sm font-medium hover:text-primary">Features</a>
            <a href="/login" className="text-sm font-medium hover:text-primary">Log in</a>
            <a href="/signup" className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">Sign up</a>
          </nav>
        </div>
      </header>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-6">
              Create Professional CVs<br />
              <span className="text-blue-600">Get Hired Faster</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Build ATS-optimized resumes with real-time scoring against any job description.
              Choose from 14 professional templates.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/signup" className="inline-flex items-center justify-center px-8 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700">
                Start Building for Free
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">
            Everything You Need to Land Your Dream Job
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="p-6 bg-white rounded-lg border">
              <h3 className="font-semibold text-lg mb-2">Real-Time ATS Score</h3>
              <p className="text-gray-600">See your match score and keyword gaps update live as you type</p>
            </div>
            <div className="p-6 bg-white rounded-lg border">
              <h3 className="font-semibold text-lg mb-2">14 Templates</h3>
              <p className="text-gray-600">Professional templates for every industry</p>
            </div>
            <div className="p-6 bg-white rounded-lg border">
              <h3 className="font-semibold text-lg mb-2">ATS-Optimized</h3>
              <p className="text-gray-600">Pass applicant tracking systems</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-12 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">© 2024 CV Builder. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
