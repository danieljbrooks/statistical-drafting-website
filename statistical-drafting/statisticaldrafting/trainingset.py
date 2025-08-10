import math
import os
import time
from datetime import datetime, timedelta
from typing import List, Tuple

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import torch
from torch.utils.data import DataLoader, Dataset


def remove_basics(draft_chunk: pd.DataFrame) -> pd.DataFrame:
    # Remove basic lands from raw 17lands dataset
    basic_names = ["Forest", "Island", "Mountain", "Plains", "Swamp"]
    columns_to_drop = ["pack_card_" + b for b in basic_names] + [
        "pool_" + b for b in basic_names
    ]

    # If basics are in set, drop them: 
    if len(set(draft_chunk.columns).intersection(columns_to_drop)) > 0:
        draft_chunk = draft_chunk.drop(columns=columns_to_drop)
        draft_chunk = draft_chunk[~draft_chunk["pick"].isin(basic_names)]

    return draft_chunk


class PickDataset(Dataset):
    def __init__(self, pools, packs, pick_vectors, cardnames, rarities):
        self.pools = pools
        self.packs = packs
        self.pick_vectors = pick_vectors
        self.cardnames = cardnames
        self.rarities = rarities

    def __len__(self):
        return len(self.packs)

    def __getitem__(self, index):
        return (
            torch.from_numpy(self.pools[index]),
            torch.from_numpy(self.packs[index]),
            torch.from_numpy(self.pick_vectors[index]),
        )


def create_card_csv(
    set_abbreviation: str,
    cardnames: List[str],
    data_folder_cards: str = "../data/cards/",
    reprocess: bool = False,
) -> None:
    """
    Creates a csv describing draftable cards, including out-of-set additions.
    """
    # Use existing cardname file if it exists.
    set_card_path = data_folder_cards + set_abbreviation + ".csv"
    if os.path.exists(set_card_path) and reprocess is False:
        print(f"Using existing cardname file, {set_card_path}")
        return

    # This file should be most recent list of cards from 17lands.
    df = pd.read_csv(data_folder_cards + "/cards.csv")

    # Check that set abbreviation is valid.
    if set_abbreviation not in df["expansion"].unique():
        raise Exception(
            f"{set_abbreviation} not found in card list. Consider choosing a new set abbreviation or downloading a new list of cards from https://www.17lands.com/public_datasets"
        )

    # Filter down to cards in set.
    df = df[df["name"].isin(cardnames)]
    df = df[df["is_booster"]]

    # Prioritize cards from the current expansion.
    df["is_target_expansion"] = df["expansion"] == set_abbreviation
    df = df.groupby("name").last()

    # Mark non-expansion cards with "special" rarity
    df.loc[~df["is_target_expansion"], "rarity"] = "special"
    df = df.reset_index()[["name", "rarity", "color_identity"]]

    # Fix color identity
    df["color_identity"] = df["color_identity"].fillna("Colorless")
    df["color_identity"] = df["color_identity"].apply(
        lambda x: "Multicolor" if (len(x) > 1 and x != "Colorless") else x
    )

    # Write csv with cards in set.
    df.to_csv(set_card_path, index=False)
    print(f"Created new cardname file for {set_abbreviation}, {set_card_path}")

def get_min_winrate(n_games: int,
                    p: float = 0.55, 
                    stdev: float = 1.96) -> float:
    """
    Returns minimum winrate that true winrate > p

    For the default stdev=1.96, this is 95% confident
    """
    return p + stdev * math.sqrt(n_games * p * (1 - p)) / n_games

def create_dataset(
    set_abbreviation: str,
    draft_mode: str = "Premier",
    overwrite: bool = False,
    omit_first_days: int = 2,
    train_fraction: float = 0.8,
    data_folder_17lands: str = "../data/17lands/",
    data_folder_training_set: str = "../data/training_sets/",
    data_folder_cards: str = "../data/cards/",
) -> Tuple[str, str]:
    """
    Creates clean training and validation datasets from raw 17lands data.

    Args:
        set_abbreviation (str): Three letter abbreviation of set to create training set of.
        draft_mode (str): Use either "Premier" or "Trad" draft data.
        overwrite (bool): If False, won't overwrite an existing dataset for the set and draft mode.
        omit_first_days (int): Omit this many days from the beginning of the dataset.
        train_fraction (float): Fraction of dataset to use for training.
        data_folder_17lands (str): Folder where raw 17lands files are stored.
        data_folder_training_set (str): Folder where processed training & validation sets are stored.
        data_folder_cards (str): Folder where card info is stored.
    """
    # Check if training set exists.
    train_filename = f"{set_abbreviation}_{draft_mode}_train.pth"
    val_filename = f"{set_abbreviation}_{draft_mode}_val.pth"
    train_path = data_folder_training_set + train_filename
    val_path = data_folder_training_set + val_filename
    if overwrite == False and os.path.exists(train_path) and os.path.exists(val_path):
        print("Training and validation sets already exist. Skipping.")
        return train_path, val_path

    # Validate input file.
    csv_path = f"{data_folder_17lands}draft_data_public.{set_abbreviation}.{draft_mode}Draft.csv.gz"
    if os.path.exists(csv_path):
        print(f"Using input file {csv_path}")
    else:
        print(f"Did not find file {csv_path}")

    # Initialization on a single chunk.
    for draft_chunk in pd.read_csv(csv_path, chunksize=10000, compression="gzip"):

        # Remove basics.
        draft_chunk = remove_basics(draft_chunk)

        # Get date 1 week after start of draft (assumes drafts sorted by draft time).
        first_date_str = draft_chunk["draft_time"].min()
        first_date_obj = datetime.strptime(first_date_str, "%Y-%m-%d %H:%M:%S")
        min_date_obj = first_date_obj + timedelta(days=omit_first_days)
        min_date_str = min_date_obj.strftime("%Y-%m-%d %H:%M:%S")

        # Get cardnames and ids.
        pack_cols = [col for col in draft_chunk.columns if col.startswith("pack_card")]
        cardnames = [col[10:] for col in sorted(pack_cols)]
        class_to_index = {cls: idx for idx, cls in enumerate(cardnames)}

        print("Completed initialization.")
        break

    # Process full input csv in chunks.
    pack_chunks, pool_chunks, pick_chunks = [], [], []
    chunk_size = 100000
    t0 = time.time()
    for i, draft_chunk in enumerate(
        pd.read_csv(csv_path, chunksize=chunk_size, compression="gzip")
    ):

        # Remove basics.
        draft_chunk = remove_basics(draft_chunk)

        # # Only keep drafts with maximum # of wins.
        # min_match_wins = 7 if draft_mode == "Premier" else 3
        # draft_chunk = draft_chunk[draft_chunk["event_match_wins"] >= min_match_wins]
        # print(f"Filtering by match wins >= {min_match_wins}")

        # Omit first days.
        draft_chunk = draft_chunk[draft_chunk["draft_time"] >= min_date_str]
        # print("Filtering chunk by date")

        # Require 95% confidence that winrate >= 0.54.
        min_winrate = draft_chunk["user_n_games_bucket"].apply(get_min_winrate, p=0.55, stdev=1.5)
        draft_chunk = draft_chunk[draft_chunk["user_game_win_rate_bucket"] >= min_winrate]
        # print("Filtering chunk by confidence winrate >= 0.55")

        # Top 3% of drafters.
        # draft_chunk = draft_chunk[draft_chunk["user_game_win_rate_bucket"] >= 0.66]
        # draft_chunk = draft_chunk[draft_chunk["user_n_games_bucket"] >= 100]
        # print(f"Filtering by match winrate>=0.66 and n_games>=100")

        # Extract packs.
        pack_chunk = draft_chunk[sorted(pack_cols)].astype(bool)

        # Extract pools.
        pool_cols = [col for col in draft_chunk.columns if col.startswith("pool_")]
        pool_chunk = draft_chunk[sorted(pool_cols)].astype(np.uint8)

        # Extract picks.
        pick_chunk = np.zeros((len(draft_chunk), len(cardnames)), dtype=bool)
        for j, item in enumerate(draft_chunk["pick"]):
            pick_chunk[j, class_to_index[item]] = True

        # Append data (consider multiple files for memory efficiency).
        pick_chunks.append(pick_chunk)
        pack_chunks.append(pack_chunk)
        pool_chunks.append(pool_chunk)

        if i % 10 == 0:
            print(f"Loaded {chunk_size * i} picks, t=", round(time.time() - t0, 1), "s")

    print("Loaded all draft data.")

    # Make sure we have a card csv. 
    create_card_csv(
        set_abbreviation=set_abbreviation, cardnames=cardnames
    )

    # Get rarities for set. 
    rarities = pd.read_csv("../data/cards/" + set_abbreviation + ".csv")["rarity"].tolist() #TODO check if sorted. 

    # Concatenate all chunks into a single Dataframe
    picks = np.vstack(pick_chunks)
    packs = pd.concat(pack_chunks, ignore_index=True)
    pools = pd.concat(pool_chunks, ignore_index=True)

    # Create train and validation datasets.
    pools_train, pools_test, packs_train, packs_test, picks_train, picks_test = train_test_split(
        pools, packs, picks, test_size=0.2, random_state=42
    )
    pick_train_dataset = PickDataset(
        pools_train.values, packs_train.values, picks_train, cardnames, rarities
    )
    pick_val_dataset = PickDataset(
        pools_test.values, packs_test.values, picks_test, cardnames, rarities
    )

    # Previous train/test split - segmented by time. 
    # tsize = round(len(pools) * train_fraction)
    # pick_train_dataset = PickDataset(
    #     pools[:tsize].values, packs[:tsize].values, picks[:tsize], cardnames, rarities
    # )
    # pick_val_dataset = PickDataset(
    #     pools[tsize:].values, packs[tsize:].values, picks[tsize:], cardnames, rarities
    # )

    # Serialize updated datasets.
    if not os.path.exists(data_folder_training_set):
        os.makedirs(data_folder_training_set)

    # Write datasets.
    torch.save(pick_train_dataset, train_path)
    print(f"A total of {len(pick_train_dataset)} picks in the training set.")
    print(f"Saved training set to {train_path}")
    torch.save(pick_val_dataset, val_path)
    print(f"Saved validation set to {val_path}")

    return train_path, val_path
