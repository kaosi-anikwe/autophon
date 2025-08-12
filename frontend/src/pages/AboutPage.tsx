export function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">About Autophon</h1>
        
        <div className="prose prose-lg">
          <p className="text-xl text-gray-600 mb-6">
            Autophon is a forced phonetic alignment system that automatically aligns 
            audio recordings with their corresponding transcriptions at the phoneme level.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">What is Forced Alignment?</h2>
          <p className="text-gray-600 mb-6">
            Forced alignment is a technique used in speech processing to automatically 
            determine the temporal boundaries of phonemes, words, or other linguistic 
            units within an audio recording, given a known transcription.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Supported Languages</h2>
          <p className="text-gray-600 mb-6">
            We support multiple languages with specialized acoustic models, including 
            Nordic languages (Danish, Swedish, Norwegian, Icelandic, Faroese) and 
            other major languages like English, French, German, and Spanish.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Alignment Engines</h2>
          <p className="text-gray-600 mb-4">
            Choose from several state-of-the-art alignment engines:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6">
            <li>Montreal Forced Alignment (MFA) - Versions 1.0 and 2.0</li>
            <li>FAVE-Align - Optimized for sociolinguistic research</li>
            <li>faseAlign - Specialized for Spanish alignment</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Research Applications</h2>
          <p className="text-gray-600">
            Autophon is designed for researchers in phonetics, sociolinguistics, 
            and speech processing who need accurate temporal alignment of speech data 
            for acoustic analysis, corpus development, and linguistic research.
          </p>
        </div>
      </div>
    </div>
  )
}