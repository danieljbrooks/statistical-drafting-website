class DraftingAssistant {
    constructor() {
        console.log('DraftingAssistant constructor called');
        this.cardData = [];
        this.collection = {};
        this.compareCollection = {};
        this.currentSet = null;
        this.onnxModel = null;
        
        // Initialize filters
        this.filters = {
            rarities: [],
            colors: [],
            maxCards: '10'
        };
        
        // Available sets that have Premier Draft models
        this.availableSetModels = ['FIN', 'TDM', 'DFT', 'PIO', 'FDN', 'DSK', 'BLB', 'MH3', 'OTJ', 'MKM', 'KTK', 'LCI', 'WOE', 'LTR', 'MOM', 'SIR', 'SNC', 'NEO', 'ONE', 'BRO', 'DMU'];
        console.log('Constructor complete, availableSetModels:', this.availableSetModels);
        
        // Don't initialize here - wait for DOM ready
    }

    async initializeEventListeners() {
        // Set selection
        document.getElementById('setSelect').addEventListener('change', (e) => {
            this.onSetChange(e.target.value);
        });

        // Collection controls
        document.getElementById('findCardBtn').addEventListener('click', async () => {
            await this.showAddCardModal();
        });

        document.getElementById('newDraftBtn').addEventListener('click', () => {
            this.newDraft();
        });

        // Modal controls
        const modal = document.getElementById('addCardModal');
        const closeBtn = document.querySelector('.close');
        const cardSearch = document.getElementById('cardSearch');

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        cardSearch.addEventListener('input', (e) => {
            this.searchCards(e.target.value);
        });

        // Initialize filter listeners first
        this.initializeFilterListeners();

        // Load available sets
        await this.loadAvailableSets();
    }

    initializeFilterListeners() {
        // Add event listeners to all filter checkboxes
        document.querySelectorAll('input[name="rarity"], input[name="color"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.applyFilters();
            });
        });

        // Add event listener to max cards select
        const maxCardsSelect = document.getElementById('maxCardsSelect');
        if (maxCardsSelect) {
            maxCardsSelect.addEventListener('change', () => {
                const maxCards = maxCardsSelect.value;
                this.applyFilters();
            });
        }
    }

    getFilterValues() {
        // Get selected rarities
        const selectedRarities = Array.from(document.querySelectorAll('input[name="rarity"]:checked'))
            .map(checkbox => checkbox.value);

        // Get selected colors
        const selectedColors = Array.from(document.querySelectorAll('input[name="color"]:checked'))
            .map(checkbox => checkbox.value);

        // Get max cards selection
        const maxCardsSelect = document.getElementById('maxCardsSelect');
        const maxCards = maxCardsSelect ? maxCardsSelect.value : '10';

        const filters = {
            rarities: selectedRarities,
            colors: selectedColors,
            maxCards: maxCards
        };

        console.log('Filter values read from UI:', filters);
        return filters;
    }

    applyFilters() {
        try {
            const filters = this.getFilterValues();
            console.log('Applying filters:', filters);

            let filteredData;
            
            // If "Deck" is selected, show all cards in collection regardless of rarity/color filters
            if (filters.maxCards === 'deck') {
                filteredData = this.cardData.filter(card => (this.collection[card.name] || 0) > 0);
                console.log('Deck filter selected - showing all cards in collection:', filteredData.length);
            } else {
                // Apply normal rarity and color filtering
                filteredData = this.cardData.filter(card => {
                    // Handle special rarity cards - treat them as mythic for filtering
                    let cardRarity = card.rarity.toLowerCase();
                    if (cardRarity === 'special') {
                        cardRarity = 'mythic';
                    }
                    
                    // If no rarities selected, show all rarities
                    const rarityMatch = filters.rarities.length === 0 || filters.rarities.includes(cardRarity);
                    // If no colors selected, show all colors  
                    const colorMatch = filters.colors.length === 0 || filters.colors.includes(card.color_identity);
                    return rarityMatch && colorMatch;
                });
                console.log('After rarity/color filtering:', filteredData.length);
                console.log('Selected rarities:', filters.rarities);
                console.log('Selected colors:', filters.colors);
            }

            // Update the filters object with current checkbox states
            this.filters = filters;

            // Update the pick order with filtered data
            this.updatePickOrderWithData(filteredData, filters.maxCards);
        } catch (error) {
            console.error('Error applying filters:', error);
            const tbody = document.querySelector('#pickOrderTable tbody');
            tbody.innerHTML = '<tr><td colspan="8">Error applying filters: ' + error.message + '</td></tr>';
        }
    }

    updateFilterStatus(filteredCount, totalCount) {
        // Filter status message removed as requested
    }

    async updatePickOrderWithData(filteredData, maxCards) {
        const tbody = document.querySelector('#pickOrderTable tbody');
        
        try {
            // Show loading message
            tbody.innerHTML = '<tr><td colspan="8">Calculating ratings...</td></tr>';
            
            // Get P1P1 ratings (empty collection)
            const p1p1Ratings = await this.getCardRatings({});
            
            // Get current ratings (with current collection)
            const currentRatings = await this.getCardRatings(this.collection);
            
            console.log(`P1P1 ratings (empty collection): ${p1p1Ratings.slice(0, 5).join(', ')}...`);
            console.log(`Current ratings (collection: ${Object.keys(this.collection).join(', ')}): ${currentRatings.slice(0, 5).join(', ')}...`);
            
            const pickOrderData = filteredData.map((card, index) => {
                const originalIndex = this.cardData.findIndex(c => c.name === card.name);
                return {
                    ...card,
                    rating: currentRatings[originalIndex] || 50,
                    p1p1_rating: p1p1Ratings[originalIndex] || 50,
                    synergy: (currentRatings[originalIndex] || 50) - (p1p1Ratings[originalIndex] || 50)
                };
            });

            // Update the main cardData array with ratings so they're available for search
            this.cardData.forEach((card, index) => {
                card.rating = currentRatings[index] || 50;
                card.p1p1_rating = p1p1Ratings[index] || 50;
                card.synergy = (currentRatings[index] || 50) - (p1p1Ratings[index] || 50);
            });

            console.log('Created pick order data, sorting by rating...');
            // Sort by rating (highest first)
            pickOrderData.sort((a, b) => b.rating - a.rating);

            // Apply max cards filter after sorting
            let finalPickOrderData = pickOrderData;
            if (maxCards !== 'all' && maxCards !== 'deck') {
                const maxCardsNum = parseInt(maxCards);
                finalPickOrderData = pickOrderData.slice(0, maxCardsNum);
                console.log('After max cards filter:', finalPickOrderData.length);
            }

            // Filter status update removed as requested

            console.log('Displaying pick order with', finalPickOrderData.length, 'cards');
            this.displayPickOrder(finalPickOrderData);
        } catch (error) {
            console.error('Error in updatePickOrderWithData:', error);
            // Show error in table
            tbody.innerHTML = '<tr><td colspan="8">Error updating pick order: ' + error.message + '</td></tr>';
        }
    }

    loadAvailableSets() {
        console.log('loadAvailableSets called');
        // Order sets chronologically from newest to oldest (as provided by user)
        const setOrder = [
            'FIN', 'TDM', 'DFT', 'PIO', 'FDN', 'DSK', 'BLB', 'MH3', 'OTJ', 'MKM', 
            'KTK', 'LCI', 'WOE', 'LTR', 'MOM', 'SIR', 'SNC', 'NEO', 'ONE', 'BRO', 
            'DMU'
        ];
        
        // Filter to only include sets that have Premier Draft models available
        const availableSets = setOrder.filter(set => {
            return this.availableSetModels.includes(set);
        });
        
        console.log('Available sets in chronological order:', availableSets);
        console.log('this.availableSetModels:', this.availableSetModels);
        this.populateSetDropdown(availableSets);
    }

    populateSetDropdown(sets) {
        console.log('populateSetDropdown called with sets:', sets);
        const setSelect = document.getElementById('setSelect');
        console.log('setSelect element found:', setSelect);
        
        if (!setSelect) {
            console.error('setSelect element not found!');
            return;
        }
        
        setSelect.innerHTML = '';
        
        sets.forEach(set => {
            const option = document.createElement('option');
            option.value = set;
            option.textContent = set;
            setSelect.appendChild(option);
        });
        
        console.log('Dropdown populated with options:', setSelect.options.length);
        
        // Auto-select the first (most recent) set
        if (sets.length > 0) {
            setSelect.value = sets[0];
            console.log('Auto-selected set:', sets[0]);
            // Trigger the set change to load data
            this.onSetChange(sets[0]);
        }
    }

    async onSetChange(setName) {
        if (!setName) return;

        // Start new draft when changing sets
        this.collection = {};
        this.compareCollection = {};
        // this.updateCollectionTable(); // No longer needed

        // Clear compare section when changing sets
        this.updateCompareTable();
        this.hideCompareSectionIfEmpty();

        // Show loading message
        const tbody = document.querySelector('#pickOrderTable tbody');
        tbody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

        try {
            await this.loadCardData(setName);
            await this.loadModel(setName);
            this.applyFilters(); // Use filters instead of updatePickOrder
            
            // Update deck table
            this.updateDeckTable();
        } catch (error) {
            console.error('Error loading set:', error);
            tbody.innerHTML = '<tr><td colspan="7">Error loading set</td></tr>';
        }
    }

    async loadCardData(setName) {
        try {
            const response = await fetch(`data/cards/${setName}.csv`);
            const csvText = await response.text();
            this.cardData = this.parseCSV(csvText);
            this.cardnames = this.cardData.map(card => card.name);
        } catch (error) {
            console.error('Error loading card data:', error);
            alert('Failed to load card data for this set.');
        }
    }

    async loadModel(setName) {
        try {
            const modelPath = `data/onnx/${setName}_Premier.onnx`;
            console.log(`Loading model from: ${modelPath}`);
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Model loading timeout')), 30000); // 30 second timeout
            });
            
            const modelPromise = ort.InferenceSession.create(modelPath);
            
            this.model = await Promise.race([modelPromise, timeoutPromise]);
            console.log(`Model loaded successfully for ${setName}`);
            console.log('Model input names:', this.model.inputNames);
            console.log('Model output names:', this.model.outputNames);
        } catch (error) {
            console.error('Error loading model:', error);
            this.model = null;
            // Don't alert here - we'll handle it gracefully in getCardRatings
        }
    }

    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const cards = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = this.parseCSVLine(lines[i]);
                const card = {};
                headers.forEach((header, index) => {
                    card[header] = values[index] || '';
                });
                cards.push(card);
            }
        }

        return cards;
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values.map(v => v.replace(/"/g, ''));
    }

    async getCardRatings(collection = {}) {
        if (!this.model) {
            console.log('No model loaded, returning default ratings');
            return new Array(this.cardData.length).fill(50);
        }

        try {
            // Convert collection object to vector format
            const collectionVector = new Array(this.cardData.length).fill(0);
            Object.entries(collection).forEach(([cardName, count]) => {
                const index = this.cardnames.indexOf(cardName);
                if (index !== -1) {
                    collectionVector[index] = count;
                }
            });

            // Create pack vector (all 1s as requested)
            const packVector = new Array(this.cardData.length).fill(1);

            console.log(`Collection vector: ${collectionVector.filter(c => c > 0).length} cards with count > 0`);
            console.log(`Pack vector: ${packVector.filter(p => p === 1).length} cards in pack`);

            const feeds = {
                collection: new ort.Tensor('float32', collectionVector, [1, this.cardData.length]),
                pack: new ort.Tensor('float32', packVector, [1, this.cardData.length])
            };

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Model inference timeout')), 15000); // 15 second timeout
            });
            
            const inferencePromise = this.model.run(feeds);
            const results = await Promise.race([inferencePromise, timeoutPromise]);

            console.log('Model output keys:', Object.keys(results));
            console.log('Model output structure:', results);

            // Try to find the scores in the output
            let scores;
            if (results.scores && results.scores.data) {
                scores = results.scores.data;
            } else if (results.output && results.output.data) {
                scores = results.output.data;
            } else if (results[Object.keys(results)[0]] && results[Object.keys(results)[0]].data) {
                // Use the first available output
                scores = results[Object.keys(results)[0]].data;
            } else {
                console.error('Could not find scores in model output:', results);
                return new Array(this.cardData.length).fill(50);
            }

            console.log(`Raw scores: ${scores.slice(0, 5).join(', ')}...`);

            // Normalize scores to 0-100 range using sigmoid
            const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
            const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
            const std = Math.sqrt(variance);

            const normalizedScores = scores.map(score => {
                const normalized = 1 / (1 + Math.exp(-(score - mean) / std));
                return normalized * 100;
            });

            console.log(`Normalized scores: ${normalizedScores.slice(0, 5).join(', ')}...`);

            return normalizedScores;
        } catch (error) {
            console.error('Error getting card ratings:', error);
            return new Array(this.cardData.length).fill(50);
        }
    }

    async updatePickOrder() {
        if (!this.cardData || !this.cardnames.length) return;

        // Use the filtering system to update the pick order
        this.applyFilters();
    }

    displayPickOrder(pickOrderData) {
        const tbody = document.querySelector('#pickOrderTable tbody');
        tbody.innerHTML = '';

        if (pickOrderData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No cards found</td></tr>';
            return;
        }

        pickOrderData.forEach(card => {
            const row = document.createElement('tr');
            row.setAttribute('data-color', card.color_identity);
            
            row.innerHTML = `
                <td>${card.name}</td>
                <td><span class="color-${card.color_identity}">${card.color_identity}</span></td>
                <td class="rarity-${this.getRarityClass(card.rarity)}">${this.getRarityAbbreviation(card.rarity)}</td>
                <td class="rating ${this.getRatingClass(card.rating)}">${card.rating.toFixed(1)}</td>
                <td class="synergy ${card.synergy >= 0 ? 'synergy-positive' : 'synergy-negative'}">${card.synergy >= 0 ? '+' : ''}${card.synergy.toFixed(1)}</td>
                <td>
                    <button class="btn btn-compare" data-card-name="${this.escapeHtmlAttribute(card.name)}">Compare</button>
                </td>
                <td>
                    <button class="btn btn-pick" data-card-name="${this.escapeHtmlAttribute(card.name)}">Pick</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners for pick buttons
        this.addTableButtonListeners();
        
        // Update deck table
        this.updateDeckTable();
    }

    escapeHtmlAttribute(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addTableButtonListeners() {
        // Add event listeners for pick buttons
        const pickButtons = document.querySelectorAll('#pickOrderTable .btn-pick');
        pickButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const cardName = e.target.getAttribute('data-card-name');
                this.pickCard(cardName);
            });
        });

        // Add event listeners for compare buttons
        const compareButtons = document.querySelectorAll('#pickOrderTable .btn-compare');
        compareButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const cardName = e.target.getAttribute('data-card-name');
                this.addCardToCompare(cardName);
            });
        });
    }

    getRatingClass(rating) {
        if (rating >= 70) return 'rating-high';
        if (rating >= 50) return 'rating-medium';
        return 'rating-low';
    }

    async showAddCardModal() {
        if (!this.cardData) {
            alert('Please select a set first.');
            return;
        }

        // Ensure ratings are calculated before showing the modal
        if (!this.cardData[0]?.rating && this.model) {
            try {
                // Calculate ratings for all cards if they haven't been calculated yet
                const currentRatings = await this.getCardRatings(this.collection);
                const p1p1Ratings = await this.getCardRatings({});
                
                this.cardData.forEach((card, index) => {
                    card.rating = currentRatings[index] || 50;
                    card.p1p1_rating = p1p1Ratings[index] || 50;
                    card.synergy = (currentRatings[index] || 50) - (p1p1Ratings[index] || 50);
                });
            } catch (error) {
                console.error('Error calculating ratings for modal:', error);
            }
        }

        const modal = document.getElementById('addCardModal');
        modal.style.display = 'block';
        document.getElementById('cardSearch').value = '';
        
        // Show initial cards (first 10 alphabetically) so users know what to type
        this.showInitialCards();
    }

    showInitialCards() {
        const cardNames = this.cardData.map(card => card.name).sort();
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';

        if (cardNames.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">No cards found in this set.</div>';
            return;
        }

        // Show all cards alphabetically (unaffected by filter)
        const initialCards = cardNames;
        initialCards.forEach(cardName => {
            const card = this.cardData.find(c => c.name === cardName);
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.setAttribute('data-color', card.color_identity);
            item.innerHTML = `
                <div class="search-result-content">
                    <div class="card-name">${cardName}</div>
                    <div class="card-rarity">${this.getRarityAbbreviation(card.rarity)}</div>
                    <div class="card-rating">${card.rating ? card.rating.toFixed(1) : 'N/A'}</div>
                </div>
                <div class="search-result-buttons">
                    <button class="btn btn-compare" data-card-name="${this.escapeHtmlAttribute(cardName)}">Compare</button>
                    <button class="btn btn-pick" data-card-name="${this.escapeHtmlAttribute(cardName)}">Pick</button>
                </div>
            `;
            
            // Add event listener for compare button
            const compareButton = item.querySelector('.btn-compare');
            compareButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row click
                this.addCardToCompare(cardName);
            });
            
            // Add event listener for pick button
            const pickButton = item.querySelector('.btn-pick');
            pickButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row click
                this.addCardToCollection(cardName);
                document.getElementById('addCardModal').style.display = 'none';
            });
            
            resultsContainer.appendChild(item);
        });
    }

    searchCards(query) {
        if (!this.cardData) return;

        // If query is empty, show initial cards
        if (!query.trim()) {
            this.showInitialCards();
            return;
        }

        let results = this.cardData.filter(card => 
            card.name.toLowerCase().includes(query.toLowerCase())
        );

        // Limit to 10 results
        results = results.slice(0, 10);

        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">No cards found</div>';
            return;
        }

        results.forEach(card => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.setAttribute('data-color', card.color_identity);
            item.innerHTML = `
                <div class="search-result-content">
                    <div class="card-name">${card.name}</div>
                    <div class="card-rarity">${this.getRarityAbbreviation(card.rarity)}</div>
                    <div class="card-rating">${card.rating ? card.rating.toFixed(1) : 'N/A'}</div>
                </div>
                <div class="search-result-buttons">
                    <button class="btn btn-compare" data-card-name="${this.escapeHtmlAttribute(card.name)}">Compare</button>
                    <button class="btn btn-pick" data-card-name="${this.escapeHtmlAttribute(card.name)}">Pick</button>
                </div>
            `;
            
            // Add event listener for compare button
            const compareButton = item.querySelector('.btn-compare');
            compareButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row click
                this.addCardToCompare(card.name);
            });
            
            // Add event listener for pick button
            const pickButton = item.querySelector('.btn-pick');
            pickButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row click
                this.addCardToCollection(card.name);
                document.getElementById('addCardModal').style.display = 'none';
            });
            
            resultsContainer.appendChild(item);
        });
    }

    addCardToCollection(cardName) {
        if (this.collection[cardName] === undefined) {
            this.collection[cardName] = 1;
        } else {
            this.collection[cardName]++;
        }
        
        // Clear compare collection when deck changes
        this.compareCollection = {};
        this.updateCompareTable();
        this.hideCompareSectionIfEmpty();
        
        // this.updateCollectionTable(); // No longer needed
        this.applyFilters(); // Use filters instead of updatePickOrder
    }

    addCardToCompare(cardName) {
        // Check if card is already being compared
        if (this.compareCollection[cardName]) {
            // Show feedback that card is already being compared
            console.log(`${cardName} is already being compared`);
            return; // Don't add duplicate
        }
        
        // Add card to compare collection (only one instance per card)
        this.compareCollection[cardName] = true;
        
        // Update compare table
        this.updateCompareTable();
        
        // Show compare section
        this.showCompareSection();
    }

    removeCardFromCompare(cardName) {
        delete this.compareCollection[cardName];
        
        // Update compare table
        this.updateCompareTable();
        
        // Hide compare section if empty
        this.hideCompareSectionIfEmpty();
    }

    pickCardFromCompare(cardName) {
        // Add card to deck collection (this will clear compare collection)
        this.addCardToCollection(cardName);
        
        // Update deck table
        this.updateDeckTable();
    }

    updateCompareTable() {
        const tbody = document.querySelector('#compareTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const compareCards = Object.keys(this.compareCollection);
        
        if (compareCards.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No cards to compare</td></tr>';
            return;
        }
        
        // Sort compare cards by rating (highest to lowest)
        const sortedCompareCards = compareCards
            .map(cardName => {
                const card = this.cardData.find(c => c.name === cardName);
                return { cardName, card, rating: card?.rating || 0 };
            })
            .filter(item => item.card) // Filter out cards not found in cardData
            .sort((a, b) => b.rating - a.rating); // Sort by rating descending
        
        sortedCompareCards.forEach(({ cardName, card }) => {
            const row = document.createElement('tr');
            row.setAttribute('data-color', card.color_identity);
            row.innerHTML = `
                <td>${cardName}</td>
                <td class="rating ${this.getRatingClass(card.rating)}">${card.rating ? card.rating.toFixed(1) : 'N/A'}</td>
                <td>
                    <button class="btn btn-pick" data-card-name="${this.escapeHtmlAttribute(cardName)}">Pick</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners for pick buttons in compare table
        const pickButtons = document.querySelectorAll('#compareTable .btn-pick');
        pickButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const cardName = e.target.getAttribute('data-card-name');
                this.pickCardFromCompare(cardName);
            });
        });
    }

    showCompareSection() {
        const compareSection = document.getElementById('compareSection');
        if (compareSection) {
            compareSection.style.display = 'block';
        }
    }

    hideCompareSectionIfEmpty() {
        if (Object.keys(this.compareCollection).length === 0) {
            const compareSection = document.getElementById('compareSection');
            if (compareSection) {
                compareSection.style.display = 'none';
            }
        }
    }

    pickCard(cardName) {
        // Find card and add to collection and update tables
        this.addCardToCollection(cardName);
        
        // Show feedback
        console.log(`Picked: ${cardName}`);
        
        // Clear compare collection when picking
        this.compareCollection = {};
        this.updateCompareTable();
        this.hideCompareSectionIfEmpty();
        
        // Update deck table
        this.updateDeckTable();
        
        // The updatePickOrder() call in addCardToCollection will recalculate ratings
        // with the new collection, so the Rating and P1P1 Rating columns will now differ
    }

    removeCardFromCollection(cardName) {
        if (this.collection[cardName] === 1) {
            delete this.collection[cardName];
        } else if (this.collection[cardName] > 1) {
            this.collection[cardName]--;
        }
        
        // Clear compare collection when deck changes
        this.compareCollection = {};
        this.updateCompareTable();
        this.hideCompareSectionIfEmpty();
        
        // this.updateCollectionTable(); // No longer needed
        this.applyFilters(); // Use filters instead of updatePickOrder
        
        // Update deck table
        this.updateDeckTable();
    }

    updateDeckTable() {
        const tbody = document.querySelector('#deckTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const deckCards = Object.entries(this.collection).filter(([_, count]) => count > 0);
        
        if (deckCards.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No cards in deck</td></tr>';
            return;
        }
        
        // Sort deck cards by rating (highest to lowest) and add rating data
        const sortedDeckCards = deckCards
            .map(([cardName, count]) => {
                const card = this.cardData.find(c => c.name === cardName);
                return { cardName, count, card, rating: card?.rating || 0 };
            })
            .filter(item => item.card) // Filter out cards not found in cardData
            .sort((a, b) => b.rating - a.rating); // Sort by rating descending
        
        sortedDeckCards.forEach(({ cardName, count, card }) => {
            const row = document.createElement('tr');
            row.setAttribute('data-color', card.color_identity);
            row.innerHTML = `
                <td>${cardName}</td>
                <td>${count}</td>
                <td class="rating ${this.getRatingClass(card.rating)}">${card.rating ? card.rating.toFixed(1) : 'N/A'}</td>
                <td>
                    <button class="btn btn-remove" data-card-name="${this.escapeHtmlAttribute(cardName)}">Remove</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners for remove buttons in deck table
        const removeButtons = document.querySelectorAll('#deckTable .btn-remove');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const cardName = e.target.getAttribute('data-card-name');
                this.removeCardFromCollection(cardName);
            });
        });
    }

    clearCollection() {
        this.collection = {};
        this.applyFilters();
    }

    newDraft() {
        this.collection = {};
        this.compareCollection = {};
        this.applyFilters();
        
        // Update tables
        this.updateDeckTable();
        this.updateCompareTable();
        this.hideCompareSectionIfEmpty();
    }





    getRarityAbbreviation(rarity) {
        // Handle special rarity cards
        if (rarity.toLowerCase() === 'special') {
            return 'Mythic'; // Show as Mythic for special cards
        }
        
        switch (rarity.toLowerCase()) {
            case 'mythic':
                return 'Mythic';
            case 'rare':
                return 'Rare';
            case 'uncommon':
                return 'Uncommon';
            case 'common':
                return 'Common';
            default:
                return rarity;
        }
    }

    getRarityClass(rarity) {
        // Group special rarity cards with mythic for styling
        if (rarity.toLowerCase() === 'mythic' || rarity.toLowerCase() === 'special') {
            return 'mythic';
        }
        return rarity.toLowerCase();
    }
}

// Initialize the application
let draftingAssistant;
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOMContentLoaded fired, creating DraftingAssistant');
        draftingAssistant = new DraftingAssistant();
        console.log('DraftingAssistant created, calling initializeEventListeners');
        await draftingAssistant.initializeEventListeners();
        console.log('Initialization complete');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});
