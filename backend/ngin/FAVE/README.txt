FAVE-align v2.0.3

Installed from: https://github.com/JoFrhwld/FAVE/wiki/Installing-FAVE-align
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

Note: Add FAVE-align directory to env variables as "FAVE_DIR"

Usage
cd into the FAVE-align directory and call the FAAValign.py script passing in the appropriate arguments
