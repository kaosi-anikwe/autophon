export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Autophon</h3>
            <p className="text-gray-600 text-sm">
              Forced phonetic alignment for audio and transcription files.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/help" className="hover:text-primary">Help Center</a></li>
              <li><a href="/contact" className="hover:text-primary">Contact</a></li>
              <li><a href="/docs" className="hover:text-primary">Documentation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/privacy" className="hover:text-primary">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-primary">Terms of Service</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Connect</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="/team" className="hover:text-primary">Our Team</a></li>
              <li><a href="/about" className="hover:text-primary">About</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-4 text-center text-sm text-gray-600">
          © 2024 Autophon. All rights reserved.
        </div>
      </div>
    </footer>
  )
}