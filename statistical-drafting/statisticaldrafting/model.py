import torch
import torch.nn as nn
import torch.nn.functional as F


class DraftNet(nn.Module):
    def __init__(self, cardnames, dropout_input=0.6):
        """
        Simple MLP network to predict draft picks.

        Args:
            cardnames (List[str]): Names of cards in the set.
            dropout (float): Dropout rate for regularization.
        """
        super(DraftNet, self).__init__()

        hidden_dims = [400, 400]

        # Customize to given set.
        self.cardnames = cardnames

        # Input layer
        self.input_layer = nn.Linear(len(self.cardnames), hidden_dims[0])
        self.dropout_input = nn.Dropout(dropout_input)
        self.dropout_layer = nn.Dropout(0.6)

        # Hidden layers
        self.hidden_layers = nn.ModuleList(
            nn.Linear(hidden_dims[i], hidden_dims[i + 1])
            for i in range(len(hidden_dims) - 1)
        )

        # Output layer
        self.output_layer = nn.Linear(hidden_dims[-1], len(cardnames))

        # Normalization and regularization
        self.norms = nn.ModuleList(nn.BatchNorm1d(dim) for dim in hidden_dims[1:])

    def forward(self, x, pack):
        # Input layer
        x = self.input_layer(x)
        x = self.dropout_input(x) # Try to get rid of this. 

        # Hidden layers
        for layer, norm in zip(self.hidden_layers, self.norms):
            x = layer(x)
            x = F.gelu(x)
            x = self.dropout_layer(x)

            # Apply BatchNorm1d (ensure correct shape: [batch_size, num_features])
            x = norm(x)

        # Output layer
        x = self.output_layer(x)
        x = x * pack
        return x
