Montreal Forced Aligner v2.2.17

Installed from: https://github.com/MontrealCorpusTools/Montreal-Forced-Aligner/archive/refs/tags/v2.2.17.tar.gz
Date installed: 31-08-2024

Install Dependencies
Note: Some of the dependencies are quiet heavy on CPU usage while installing
kaldi
    git clone https://github.com/kaldi-asr/kaldi.git
    follow instructions at kaldi/INSTALL
OpenFst
    confirm install: fstinfo --help
    install link: https://www.openfst.org/twiki/bin/view/FST
OpenGRM
    confrim install ngraminfo --help
    install link: https://www.openfst.org/twiki/bin/view/GRM/NGramLibrary
Baum-Welch
    install link: https://www.opengrm.org/twiki/bin/view/GRM/BaumWelch
Pynini
    pip install pynini

Install MFA
Download and extract file and copy 'Montreal-Forced-Aligner/montreal_forced_aligner' directory to desired location.
Ensure 'Montreal-Forced-Aligner/requirements.txt' is installed

Usage
create the 'mfa' file and place it in the montreal_forced_aligner directory.
make the file executable
copy the following into the file:

#!<absolute path to python executable>
# -*- coding: utf-8 -*-
import re
import sys

# manually add montreal_forced_aligner module parent path
sys.path.append("/home/nordalign/autophon/ngin/MFA2")
from montreal_forced_aligner.command_line.mfa import mfa_cli

if __name__ == "__main__":
    sys.argv[0] = re.sub(r"(-script\.pyw|\.exe)?$", "", sys.argv[0])
    sys.exit(mfa_cli())


the file is now ready to be called as the command-line interface of the MFA

Note:
add the path to the "mfa" file to the env variables as "MFA2"
