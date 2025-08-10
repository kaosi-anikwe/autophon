faseAlign v1.1.14

Installed from: https://github.com/EricWilbanks/faseAlign
Date installed: 30-07-2024

Requirements
HTK 3.4 (https://github.com/JoFrhwld/FAVE/wiki/HTK-3.4.1)
Sox 14.4 (https://github.com/JoFrhwld/FAVE/wiki/SoX)

HTK Credentials
ID: kaosi
Password uswq6VJ7

Installing requirements
// configure htk
./configure --prefix=/home/nordalign/htk --disable-hslab
change 8 spaces on line 77 in ./HLMTools/Makefile to tab

// install audiolabel
pip install git+https://github.com/rsprouse/audiolabel

// install faseAlign
pip install git+https://github.com/EricWilbanks/faseAlign.git

// clone faseAlign
git clone https://github.com/EricWilbanks/faseAlign.git

Remove .git directory


Changes made:
reformatted docs/conf.py
reformatted examples/spanish_word_example.py
reformatted examples/spanish_word_class.py
reformatted setup.py
reformatted faseAlign/utils.py
reformatted bin/faseAlign

manually added faseAlign module path to main script
added command line argument to accept custom dictionary (-d, --dict)

Note: 
Add faseAlign script path to env variables as "FASE"

Usage:
call faseAlign script passing in the appropriate arguments
