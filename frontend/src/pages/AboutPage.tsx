import { Link } from "react-router-dom";

import TextBlock from "@/components/ui/TextBlock";
import UserGuides from "@/components/features/UserGuides";

export function AboutPage() {
  return (
    <>
      <h1 className="text-[3.5rem] leading-[1.1] text-left mb-4 pb-4">About</h1>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        <div className="md:col-span-8 py-0">
          <div className="card bg-base-100 shadow-lg border-0 p-3 h-full">
            <TextBlock title="Forced alignment technology">
              Forced alignment (FA) refers to the automatic process by which
              speech recordings are phonetically time-stamped with the help of
              Hidden Markov models or Deep Neural Networks. Autophon uses the
              latter by means of the{" "}
              <a
                href="https://montreal-forced-aligner.readthedocs.io/en/v1.0/"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                The Montreal Forced Aligner 1.0
              </a>
              . The software outputs a time-stamped phonetic annotation that is
              readable in{" "}
              <a
                href="https://www.fon.hum.uva.nl/praat/"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                Praat
              </a>
              , based on an optimization of two user inputs: (1) the speech
              recording and (2) a corresponding orthographic transcription. For
              an FA tool to work for a particular language, an acoustic model
              must be trained and an accompanying pronunciation lexicon must be
              built that covers every word in the language. FA is useful because
              it automates an otherwise resource-intensive task A phonetic
              annotation done by hand can take between 250 and 400 minutes per
              recorded minute. In a place like Scandinavia where labor costs are
              high, this has presented a barrier for linguists.
            </TextBlock>
            <TextBlock title="A free online tool">
              The app is <em>free of charge</em> and was built so that students
              and researchers could access forced-alignment tools efficiently
              and without the need for command-line programs.
            </TextBlock>
            <TextBlock title="Data security">
              Everything you upload is encrypted and sent to a server in
              Frankfurt, Germany, that is run by{" "}
              <a
                href="https://www.digitalocean.com/"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                Digital Ocean
              </a>{" "}
              (server FRA1). To increase security and reduce the chance of a
              data breach, sound files are also immediately deleted after
              alignment. On the other hand, finished TextGrids are stored in
              your account for as long as you like. Once, however, you delete
              them, they will also be removed from our server permanently.
            </TextBlock>
            <TextBlock title="Platform stability">
              Autophon is in{" "}
              <a
                href="https://en.wikipedia.org/wiki/Software_release_life_cycle"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                beta
              </a>
              , which means it still has some bugs. Therefore,{" "}
              <a
                href="/support"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                contact us
              </a>{" "}
              if you encounter any problems.
            </TextBlock>
            <TextBlock title="Accuracy">
              Accuracy metrics are only available for a few high-resource
              languages. These can be accessed in the language manuals below.
              Reach out to{" "}
              <a
                href="/support"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                Support
              </a>{" "}
              if you have any manually-aligned files that you are willing to
              share with us for the purposes of validating a language model.
            </TextBlock>
            <TextBlock title="Ownership & funding">
              Autophon was founded and is managed by{" "}
              <a
                href="https://www.nateyoung.se/"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                Nate Young
              </a>{" "}
              and run by the essential stakeholders listed on our{" "}
              <a
                href="team"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                Team
              </a>{" "}
              page. Initially started with private means, it has now grown in
              scope with a grant from the{" "}
              <a
                href="https://www.svenskaakademien.se/en"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                Swedish Academy,
              </a>{" "}
              a grant from the{" "}
              <a
                href="https://www.hf.uio.no/iln/english/"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                Department of Linguistics and Scandinavian Studies
              </a>{" "}
              at The University of Oslo, and has received funding from the
              European Union’s Horizon 2020 research and innovation programme
              under the{" "}
              <a
                href="https://rea.ec.europa.eu/funding-and-grants/horizon-europe-marie-sklodowska-curie-actions_en"
                target="_blank"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                Marie Sklodowska-Curie
              </a>{" "}
              grant agreement No 892963.
            </TextBlock>
            <h5 className="text-xl font-bold flex gap-1 align-middle">
              <img
                src="/favicon.png"
                alt="Icon"
                className="my-auto w-3.5 h-3.5"
              />
              Register to access the{" "}
              <Link
                to="/register"
                className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
              >
                full toolkit*
              </Link>
            </h5>
            <div className="space-y-4 mb-2">
              <p className="text base leading-relaxed">
                or use the minimal aligner on the{" "}
                <Link
                  to="/"
                  target="_blank"
                  className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                >
                  main page
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 py-0">
          <div className="card bg-base-100 shadow-lg border-0 p-3 h-full">
            <TextBlock title="Video demo">
              <video className="w-auto h-auto my-4 py-2" controls>
                <source src="/autophondemo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </TextBlock>
            <div className="border-y border-base-300 pt-4 pb-4">
              <UserGuides>
                <h3 className="text-lg font-bold mb-0">Language guides</h3>
              </UserGuides>
            </div>
            <div className="max-h-[35rem] h-full overflow-y-scroll py-4 ">
              <TextBlock title="Current & past users">
                <p className="text-sm pb-4 pt-2">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  at Copenhagen University for the project “Toner Over Tid”, an
                  apparent time study of prosodic variation and change in
                  Danish. It is funded by Ulla og Børge Andersens Fond for
                  Sprogvidenskabelig Forskning.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/75494"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Pia Quist
                  </a>
                  ,
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  , and
                  <a
                    href="https://nors.ku.dk/english/staff/?pure=en/persons/394498"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Anna Kai Jørgensen
                  </a>
                  at Copenhagen University for the project
                  <a
                    href="https://nors.ku.dk/forskning/dialektogsprogforandring/speaking-up/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    "Speaking Up"
                  </a>
                  and its constituent study on phonetic accommodation in two
                  varieties of Jutlandic Danish. It is funded by The
                  <a
                    href="https://dff.dk/en"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    DFF – Independent Research Fund Denmark
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>{" "}
                  and
                  <a
                    href="https://www.phonetik.uni-muenchen.de/~jkirby/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. James Kirby
                  </a>
                  for their investigation into how the aspiration contrast in
                  Danish stops affects pitch.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://sites.google.com/cornell.edu/francescoburroni/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Francesco Burroni
                  </a>
                  for an investigation into the timing relationships between
                  consonantal and vocalic gestures.
                </p>
                <p className="text-sm pb-4">
                  <b>2020–2024</b>{" "}
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=43531"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Björn Lundquist
                  </a>{" "}
                  at
                  <a
                    href="https://en.uit.no/startsida"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    UiT The Arctic University of Norway
                  </a>
                  in collaboration with
                  <a
                    href="https://www.ed.ac.uk/profile/jennifer-culbertson"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Jennifer Culbertson
                  </a>
                  ,
                  <a
                    href="https://www.meredithtamminga.com/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Meredith Tamminga
                  </a>
                  ,
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=41555"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Gillian Ramchand
                  </a>
                  ,
                  <a
                    href="https://www.nateyoung.se/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nathan Young
                  </a>
                  ,
                  <a
                    href="https://sverrestausland.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Sverre Stausland Johnsen
                  </a>
                  , and
                  <a
                    href="https://www.hf.uio.no/personer/adm/fak/forskning/noklesta/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Anders Nøklestad
                  </a>
                  for the project
                  <a
                    href="https://uit.no/research/acqva/project?pid=665743"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Experimental Approaches to Syntactic Optionality (ExSynOp)
                  </a>
                  , a study on word-order phenomena and optionality in the
                  Nordic languages. It is funded by
                  <a
                    href="https://www.forskningsradet.no/en/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Research Council of Norway
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  at Copenhagen University for the project “Toner Over Tid”, an
                  apparent time study of prosodic variation and change in
                  Danish. It is funded by Ulla og Børge Andersens Fond for
                  Sprogvidenskabelig Forskning.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/75494"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Pia Quist
                  </a>
                  ,
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  , and
                  <a
                    href="https://nors.ku.dk/english/staff/?pure=en/persons/394498"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Anna Kai Jørgensen
                  </a>
                  at Copenhagen University for the project
                  <a
                    href="https://nors.ku.dk/forskning/dialektogsprogforandring/speaking-up/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    "Speaking Up"
                  </a>
                  and its constituent study on phonetic accommodation in two
                  varieties of Jutlandic Danish. It is funded by The
                  <a
                    href="https://dff.dk/en"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    DFF – Independent Research Fund Denmark
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>{" "}
                  and
                  <a
                    href="https://www.phonetik.uni-muenchen.de/~jkirby/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. James Kirby
                  </a>
                  for their investigation into how the aspiration contrast in
                  Danish stops affects pitch.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://sites.google.com/cornell.edu/francescoburroni/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Francesco Burroni
                  </a>
                  for an investigation into the timing relationships between
                  consonantal and vocalic gestures.
                </p>
                <p className="text-sm pb-4">
                  <b>2020–2024</b>{" "}
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=43531"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Björn Lundquist
                  </a>{" "}
                  at
                  <a
                    href="https://en.uit.no/startsida"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    UiT The Arctic University of Norway
                  </a>
                  in collaboration with
                  <a
                    href="https://www.ed.ac.uk/profile/jennifer-culbertson"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Jennifer Culbertson
                  </a>
                  ,
                  <a
                    href="https://www.meredithtamminga.com/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Meredith Tamminga
                  </a>
                  ,
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=41555"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Gillian Ramchand
                  </a>
                  ,
                  <a
                    href="https://www.nateyoung.se/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nathan Young
                  </a>
                  ,
                  <a
                    href="https://sverrestausland.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Sverre Stausland Johnsen
                  </a>
                  , and
                  <a
                    href="https://www.hf.uio.no/personer/adm/fak/forskning/noklesta/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Anders Nøklestad
                  </a>
                  for the project
                  <a
                    href="https://uit.no/research/acqva/project?pid=665743"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Experimental Approaches to Syntactic Optionality (ExSynOp)
                  </a>
                  , a study on word-order phenomena and optionality in the
                  Nordic languages. It is funded by
                  <a
                    href="https://www.forskningsradet.no/en/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Research Council of Norway
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  at Copenhagen University for the project “Toner Over Tid”, an
                  apparent time study of prosodic variation and change in
                  Danish. It is funded by Ulla og Børge Andersens Fond for
                  Sprogvidenskabelig Forskning.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/75494"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Pia Quist
                  </a>
                  ,
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  , and
                  <a
                    href="https://nors.ku.dk/english/staff/?pure=en/persons/394498"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Anna Kai Jørgensen
                  </a>
                  at Copenhagen University for the project
                  <a
                    href="https://nors.ku.dk/forskning/dialektogsprogforandring/speaking-up/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    "Speaking Up"
                  </a>
                  and its constituent study on phonetic accommodation in two
                  varieties of Jutlandic Danish. It is funded by The
                  <a
                    href="https://dff.dk/en"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    DFF – Independent Research Fund Denmark
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>{" "}
                  and
                  <a
                    href="https://www.phonetik.uni-muenchen.de/~jkirby/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. James Kirby
                  </a>
                  for their investigation into how the aspiration contrast in
                  Danish stops affects pitch.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://sites.google.com/cornell.edu/francescoburroni/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Francesco Burroni
                  </a>
                  for an investigation into the timing relationships between
                  consonantal and vocalic gestures.
                </p>
                <p className="text-sm pb-4">
                  <b>2020–2024</b>{" "}
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=43531"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Björn Lundquist
                  </a>{" "}
                  at
                  <a
                    href="https://en.uit.no/startsida"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    UiT The Arctic University of Norway
                  </a>
                  in collaboration with
                  <a
                    href="https://www.ed.ac.uk/profile/jennifer-culbertson"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Jennifer Culbertson
                  </a>
                  ,
                  <a
                    href="https://www.meredithtamminga.com/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Meredith Tamminga
                  </a>
                  ,
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=41555"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Gillian Ramchand
                  </a>
                  ,
                  <a
                    href="https://www.nateyoung.se/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nathan Young
                  </a>
                  ,
                  <a
                    href="https://sverrestausland.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Sverre Stausland Johnsen
                  </a>
                  , and
                  <a
                    href="https://www.hf.uio.no/personer/adm/fak/forskning/noklesta/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Anders Nøklestad
                  </a>
                  for the project
                  <a
                    href="https://uit.no/research/acqva/project?pid=665743"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Experimental Approaches to Syntactic Optionality (ExSynOp)
                  </a>
                  , a study on word-order phenomena and optionality in the
                  Nordic languages. It is funded by
                  <a
                    href="https://www.forskningsradet.no/en/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Research Council of Norway
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  at Copenhagen University for the project “Toner Over Tid”, an
                  apparent time study of prosodic variation and change in
                  Danish. It is funded by Ulla og Børge Andersens Fond for
                  Sprogvidenskabelig Forskning.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/75494"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Pia Quist
                  </a>
                  ,
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  , and
                  <a
                    href="https://nors.ku.dk/english/staff/?pure=en/persons/394498"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Anna Kai Jørgensen
                  </a>
                  at Copenhagen University for the project
                  <a
                    href="https://nors.ku.dk/forskning/dialektogsprogforandring/speaking-up/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    "Speaking Up"
                  </a>
                  and its constituent study on phonetic accommodation in two
                  varieties of Jutlandic Danish. It is funded by The
                  <a
                    href="https://dff.dk/en"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    DFF – Independent Research Fund Denmark
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>{" "}
                  and
                  <a
                    href="https://www.phonetik.uni-muenchen.de/~jkirby/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. James Kirby
                  </a>
                  for their investigation into how the aspiration contrast in
                  Danish stops affects pitch.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://sites.google.com/cornell.edu/francescoburroni/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Francesco Burroni
                  </a>
                  for an investigation into the timing relationships between
                  consonantal and vocalic gestures.
                </p>
                <p className="text-sm pb-4">
                  <b>2020–2024</b>{" "}
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=43531"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Björn Lundquist
                  </a>{" "}
                  at
                  <a
                    href="https://en.uit.no/startsida"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    UiT The Arctic University of Norway
                  </a>
                  in collaboration with
                  <a
                    href="https://www.ed.ac.uk/profile/jennifer-culbertson"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Jennifer Culbertson
                  </a>
                  ,
                  <a
                    href="https://www.meredithtamminga.com/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Meredith Tamminga
                  </a>
                  ,
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=41555"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Gillian Ramchand
                  </a>
                  ,
                  <a
                    href="https://www.nateyoung.se/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nathan Young
                  </a>
                  ,
                  <a
                    href="https://sverrestausland.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Sverre Stausland Johnsen
                  </a>
                  , and
                  <a
                    href="https://www.hf.uio.no/personer/adm/fak/forskning/noklesta/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Anders Nøklestad
                  </a>
                  for the project
                  <a
                    href="https://uit.no/research/acqva/project?pid=665743"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Experimental Approaches to Syntactic Optionality (ExSynOp)
                  </a>
                  , a study on word-order phenomena and optionality in the
                  Nordic languages. It is funded by
                  <a
                    href="https://www.forskningsradet.no/en/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Research Council of Norway
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  at Copenhagen University for the project “Toner Over Tid”, an
                  apparent time study of prosodic variation and change in
                  Danish. It is funded by Ulla og Børge Andersens Fond for
                  Sprogvidenskabelig Forskning.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/75494"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Pia Quist
                  </a>
                  ,
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>
                  , and
                  <a
                    href="https://nors.ku.dk/english/staff/?pure=en/persons/394498"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Anna Kai Jørgensen
                  </a>
                  at Copenhagen University for the project
                  <a
                    href="https://nors.ku.dk/forskning/dialektogsprogforandring/speaking-up/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    "Speaking Up"
                  </a>
                  and its constituent study on phonetic accommodation in two
                  varieties of Jutlandic Danish. It is funded by The
                  <a
                    href="https://dff.dk/en"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    DFF – Independent Research Fund Denmark
                  </a>
                  .
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://nors.ku.dk/ansatte/?pure=da/persons/164799"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nicolai Pharao
                  </a>{" "}
                  and
                  <a
                    href="https://www.phonetik.uni-muenchen.de/~jkirby/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. James Kirby
                  </a>
                  for their investigation into how the aspiration contrast in
                  Danish stops affects pitch.
                </p>
                <p className="text-sm pb-4">
                  <b>2024</b>{" "}
                  <a
                    href="https://rpuggaardrode.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Rasmus Puggaard-Rode
                  </a>{" "}
                  at
                  <a
                    href="https://www.en.phonetik.uni-muenchen.de/index.html"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Institute of Phonetics and Speech Processing, Ludwig
                    Maximilian University
                  </a>
                  in collaboration with
                  <a
                    href="https://sites.google.com/cornell.edu/francescoburroni/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Francesco Burroni
                  </a>
                  for an investigation into the timing relationships between
                  consonantal and vocalic gestures.
                </p>
                <p className="text-sm pb-4">
                  <b>2020–2024</b>{" "}
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=43531"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Björn Lundquist
                  </a>{" "}
                  at
                  <a
                    href="https://en.uit.no/startsida"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    UiT The Arctic University of Norway
                  </a>
                  in collaboration with
                  <a
                    href="https://www.ed.ac.uk/profile/jennifer-culbertson"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Jennifer Culbertson
                  </a>
                  ,
                  <a
                    href="https://www.meredithtamminga.com/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Meredith Tamminga
                  </a>
                  ,
                  <a
                    href="https://en.uit.no/ansatte/person?p_document_id=41555"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Gillian Ramchand
                  </a>
                  ,
                  <a
                    href="https://www.nateyoung.se/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Nathan Young
                  </a>
                  ,
                  <a
                    href="https://sverrestausland.github.io/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Prof. Sverre Stausland Johnsen
                  </a>
                  , and
                  <a
                    href="https://www.hf.uio.no/personer/adm/fak/forskning/noklesta/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Dr. Anders Nøklestad
                  </a>
                  for the project
                  <a
                    href="https://uit.no/research/acqva/project?pid=665743"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    Experimental Approaches to Syntactic Optionality (ExSynOp)
                  </a>
                  , a study on word-order phenomena and optionality in the
                  Nordic languages. It is funded by
                  <a
                    href="https://www.forskningsradet.no/en/"
                    target="_blank"
                    className="text-current no-underline border-b-[0.3px] border-dotted border-[#949494] hover:text-primary transition-colors"
                  >
                    The Research Council of Norway
                  </a>
                  .
                </p>
              </TextBlock>
            </div>
          </div>
        </div>
        <div className="md:col-span-12 p-3">
          <p className="text-[#949494] text-sm">
            *Creating an account helps keep your files secure while protecting
            us from attacks.
          </p>
        </div>
      </div>
    </>
  );
}
