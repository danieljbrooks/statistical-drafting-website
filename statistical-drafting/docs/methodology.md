# MTGDraftNet - Simple & Efficient ML Draft Assistants for Magic: the Gathering

## Abstract
- Releasing draft models for all sets with available data (past 4 years)
- Simple, performant, & maintainable model architecture (simple MLP)
- Easily runnable notebooks for draft assistance and review

## Introduction
- History of draft simulators and assistants
- Draft models in the literature
- Challenges of keeping up with set releases
- Release of 17lands 

## Dataset
- Pull examples from 17lands
- Preprocessing strategy (drop first 7 days, only max wins)
- Definition of packs, collections

## Methodology
- Network architecture (simple MLP)
- Training details (loss details, learning rates, batch norm)
- Description of draft assistant (full pick orders, etc)

## Results
- Training results for all sets (set name, draft mode, num examples, validation accuracy)

## Discussion
- Quirks of the dataset (rare-drafting, etc)
- Examples of synergies (Hare Apparent, etc)
- Examples from assistants (draft assistant, draft review, deckbuild assistant)

## Conclusions
- Goal of project is to make drafting AI more available to the MTG community