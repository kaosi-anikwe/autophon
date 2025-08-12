import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppSelector } from '../hooks/useAppDispatch'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export function HomePage() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedTranscriptionMode, setSelectedTranscriptionMode] = useState<string>('')

  const handleTranscriptionSelect = (mode: string) => {
    setSelectedTranscriptionMode(mode)
    setShowTranscriptionModal(false)
    setShowUploadModal(true)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background element */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-60 md:w-96 lg:w-[471px] xl:w-[529px] h-full bg-autophon-blue-gray">
          <img 
            src="/photo-grid_1f.png" 
            alt="background" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-20">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h6 className="uppercase text-lg font-normal tracking-wide text-muted-foreground mb-2">
            Automatic phonetic annotation & online forced aligner
          </h6>
          <h1 className="text-5xl lg:text-6xl font-bold font-josefin flex items-center justify-center gap-2">
            <img 
              src="/favicon.png" 
              alt="Autophon icon" 
              className="w-12 h-12 lg:w-16 lg:h-16"
            />
            Autophon
          </h1>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-8">
            <Card className="h-full shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-xl">What the app does</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    Autophon is a web app that offers <strong>free</strong> online forced alignment, 
                    transforming an audio file and its corresponding transcript into a time-aligned phonetic 
                    annotation readable in{' '}
                    <a 
                      href="https://www.fon.hum.uva.nl/praat/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 decoration-dotted"
                    >
                      Praat
                    </a>
                    . <em>Forced alignment</em> refers to the process by which a computational model identifies 
                    the time intervals in the audio that contain each phonetic segment.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Autophon utilizes a number of engines for its backend, including the{' '}
                    <a 
                      href="https://montreal-forced-aligner.readthedocs.io/en/v1.0/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 decoration-dotted"
                    >
                      Montreal Forced Aligner 1.0
                    </a>{' '}
                    <a 
                      href="https://montreal-forced-aligner.readthedocs.io" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 decoration-dotted"
                    >
                      and 2.0
                    </a>,{' '}
                    <a 
                      href="https://github.com/JoFrhwld/FAVE" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 decoration-dotted"
                    >
                      Fave-Align
                    </a>, and{' '}
                    <a 
                      href="https://github.com/EricWilbanks/faseAlign" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-foreground underline underline-offset-2 decoration-dotted"
                    >
                      faseAlign
                    </a>{' '}
                    with language-specific models trained on both read-aloud and spontaneous speech.
                  </p>
                  <Link 
                    to="/about" 
                    className="text-foreground underline underline-offset-2 decoration-dotted hover:text-primary transition-colors"
                  >
                    How does it work?
                  </Link>
                </div>

                {/* Authentication Section */}
                {!isAuthenticated && (
                  <div className="border-t pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="text-lg font-medium">Account-holder sign in</h5>
                      </div>
                      
                      <form className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                          <div className="lg:col-span-5">
                            <Input 
                              type="email" 
                              placeholder="Email address" 
                              className="w-full"
                            />
                          </div>
                          <div className="lg:col-span-5">
                            <Input 
                              type="password" 
                              placeholder="Password" 
                              className="w-full"
                            />
                          </div>
                          <div className="lg:col-span-2">
                            <Button 
                              type="submit" 
                              className="w-full bg-primary hover:bg-primary/90"
                            >
                              Log In
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id="remember" 
                              className="rounded border-gray-300"
                            />
                            <label htmlFor="remember" className="text-muted-foreground">
                              Remember Me
                            </label>
                            <button 
                              type="button" 
                              className="text-muted-foreground underline underline-offset-2 decoration-dotted ml-auto"
                            >
                              Forgot Password
                            </button>
                          </div>
                          <p className="text-muted-foreground">
                            Don't have an account?{' '}
                            <Link 
                              to="/register" 
                              className="text-muted-foreground underline underline-offset-2 decoration-dotted hover:text-primary"
                            >
                              Sign up here
                            </Link>
                          </p>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Languages and Engines */}
          <div className="lg:col-span-4">
            <Card className="h-full shadow-lg border-0">
              <CardHeader>
                <CardTitle className="text-xl">Nordic languages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Nordic Languages - Placeholder for now */}
                <div className="space-y-2">
                  <Link 
                    to="#" 
                    className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
                  >
                    <span className="w-6 h-4 bg-gray-200 rounded-sm"></span>
                    <span>Danish</span>
                  </Link>
                  <Link 
                    to="#" 
                    className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
                  >
                    <span className="w-6 h-4 bg-gray-200 rounded-sm"></span>
                    <span>Norwegian</span>
                  </Link>
                  <Link 
                    to="#" 
                    className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
                  >
                    <span className="w-6 h-4 bg-gray-200 rounded-sm"></span>
                    <span>Swedish</span>
                  </Link>
                </div>

                <div>
                  <h5 className="text-lg font-medium mb-3">Other languages</h5>
                  <div className="space-y-2">
                    <Link 
                      to="#" 
                      className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
                    >
                      <span className="w-6 h-4 bg-gray-200 rounded-sm"></span>
                      <span>English (US)</span>
                    </Link>
                    <Link 
                      to="#" 
                      className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
                    >
                      <span className="w-6 h-4 bg-gray-200 rounded-sm"></span>
                      <span>English (UK)</span>
                    </Link>
                    <Link 
                      to="#" 
                      className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
                    >
                      <span className="w-6 h-4 bg-gray-200 rounded-sm"></span>
                      <span>German</span>
                    </Link>
                  </div>
                  <button className="text-sm text-muted-foreground italic mt-2 hover:text-primary transition-colors">
                    click for a full list
                  </button>
                </div>

                <div>
                  <h5 className="text-lg font-medium mb-3">Engines</h5>
                  <div className="space-y-2">
                    <a 
                      href="https://montreal-forced-aligner.readthedocs.io/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
                    >
                      <span className="w-6 h-4 bg-gray-200 rounded-sm"></span>
                      <span>Montreal Forced Aligner</span>
                    </a>
                    <a 
                      href="https://github.com/JoFrhwld/FAVE" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 text-foreground hover:text-primary transition-colors"
                    >
                      <span className="w-6 h-4 bg-gray-200 rounded-sm"></span>
                      <span>FAVE-Align</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upload Section for Anonymous Users */}
        {!isAuthenticated && (
          <Card className="shadow-lg border-0">
            <CardContent className="py-8">
              <div className="text-center">
                <Button 
                  size="lg" 
                  className="text-xl px-8 py-6 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={() => setShowTranscriptionModal(true)}
                >
                  <span className="mr-2">+</span>
                  Align files here*
                </Button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  * Files under 100MB may be aligned without an account. To align batches as large as 750 MB 
                  and to access advanced features,{' '}
                  <Link 
                    to="/register" 
                    className="text-muted-foreground underline underline-offset-2 decoration-dotted hover:text-primary"
                  >
                    create a free account here.
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}