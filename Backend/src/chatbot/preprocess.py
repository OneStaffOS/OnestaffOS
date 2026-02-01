"""
Data Preprocessing Pipeline for IT Help Desk Chatbot

This module handles:
1. Loading and merging JSON datasets
2. Cleaning and normalizing text
3. Handling duplicates and low-quality entries  
4. Data augmentation
5. Splitting into train/validation/test sets
"""

import json
import re
import random
from typing import List, Dict, Tuple, Any
from collections import Counter
import os

from config import DATA_CONFIG, BASE_DIR


class TextPreprocessor:
    """Text cleaning and normalization"""
    
    def __init__(self):
        # Common IT synonyms for augmentation
        self.synonyms = {
            'computer': ['PC', 'machine', 'workstation', 'laptop', 'desktop', 'system'],
            'broken': ['not working', 'down', 'failed', 'crashed', 'dead', 'busted', 'malfunctioning'],
            'slow': ['laggy', 'sluggish', 'hanging', 'freezing', 'unresponsive', 'taking forever'],
            'help': ['assist', 'support', 'aid', 'fix', 'resolve', 'troubleshoot'],
            'install': ['setup', 'configure', 'deploy', 'add', 'enable', 'put'],
            'remove': ['uninstall', 'delete', 'disable', 'take off', 'get rid of'],
            'update': ['upgrade', 'patch', 'refresh', 'renew'],
            'connect': ['link', 'join', 'attach', 'hook up', 'pair'],
            'password': ['credentials', 'login', 'passphrase', 'secret', 'pass'],
            'error': ['issue', 'problem', 'bug', 'glitch', 'fault'],
            'can\'t': ['cannot', 'unable to', 'won\'t', 'failing to', 'not able to'],
        }
        
        # Contractions expansion
        self.contractions = {
            "can't": "cannot",
            "won't": "will not",
            "don't": "do not",
            "doesn't": "does not",
            "didn't": "did not",
            "isn't": "is not",
            "aren't": "are not",
            "wasn't": "was not",
            "weren't": "were not",
            "haven't": "have not",
            "hasn't": "has not",
            "hadn't": "had not",
            "couldn't": "could not",
            "wouldn't": "would not",
            "shouldn't": "should not",
            "i'm": "i am",
            "you're": "you are",
            "we're": "we are",
            "they're": "they are",
            "it's": "it is",
            "that's": "that is",
            "what's": "what is",
            "who's": "who is",
            "there's": "there is",
            "here's": "here is",
            "i've": "i have",
            "you've": "you have",
            "we've": "we have",
            "they've": "they have",
            "i'll": "i will",
            "you'll": "you will",
            "we'll": "we will",
            "they'll": "they will",
            "i'd": "i would",
            "you'd": "you would",
            "we'd": "we would",
            "they'd": "they would",
        }
    
    def clean_text(self, text: str, lowercase: bool = True) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Convert to lowercase
        if lowercase:
            text = text.lower()
        
        # Expand contractions
        for contraction, expansion in self.contractions.items():
            text = text.replace(contraction, expansion)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s\.\?\!\,\-\'\/]', '', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def augment_text(self, text: str, num_augments: int = 2) -> List[str]:
        """Generate augmented versions of text using synonym replacement"""
        augmented = [text]
        words = text.split()
        
        for _ in range(num_augments):
            new_words = words.copy()
            replacements_made = 0
            
            for i, word in enumerate(new_words):
                word_lower = word.lower()
                if word_lower in self.synonyms and random.random() < 0.3:
                    replacement = random.choice(self.synonyms[word_lower])
                    # Preserve original case if needed
                    if word[0].isupper():
                        replacement = replacement.capitalize()
                    new_words[i] = replacement
                    replacements_made += 1
            
            if replacements_made > 0:
                augmented.append(' '.join(new_words))
        
        # Add typo variations (common mistakes)
        if random.random() < 0.3:
            typo_text = self._add_typo(text)
            if typo_text != text:
                augmented.append(typo_text)
        
        return list(set(augmented))  # Remove duplicates
    
    def _add_typo(self, text: str) -> str:
        """Add realistic typos"""
        words = text.split()
        if len(words) < 2:
            return text
        
        # Select random word to modify
        idx = random.randint(0, len(words) - 1)
        word = words[idx]
        
        if len(word) < 3:
            return text
        
        typo_type = random.choice(['swap', 'delete', 'double'])
        
        if typo_type == 'swap' and len(word) > 2:
            # Swap two adjacent characters
            i = random.randint(0, len(word) - 2)
            word = word[:i] + word[i+1] + word[i] + word[i+2:]
        elif typo_type == 'delete':
            # Delete a character
            i = random.randint(0, len(word) - 1)
            word = word[:i] + word[i+1:]
        elif typo_type == 'double':
            # Double a character
            i = random.randint(0, len(word) - 1)
            word = word[:i] + word[i] + word[i:]
        
        words[idx] = word
        return ' '.join(words)


class DatasetLoader:
    """Load and merge JSON datasets"""
    
    def __init__(self, preprocessor: TextPreprocessor):
        self.preprocessor = preprocessor
    
    def load_knowledge_data(self, filepath: str) -> List[Dict[str, Any]]:
        """Load knowledge-data.json format"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        samples = []
        intents = data.get('intents', [])
        
        for intent in intents:
            tag = intent.get('tag', '')
            patterns = intent.get('patterns', [])
            responses = intent.get('responses', [])
            category = intent.get('category', 'general')
            entities = intent.get('entities', [])
            escalate = intent.get('escalate', False)
            context = intent.get('context', [])
            follow_up = intent.get('followUp', [])
            
            for pattern in patterns:
                cleaned = self.preprocessor.clean_text(pattern)
                if len(cleaned) >= DATA_CONFIG.min_pattern_length:
                    samples.append({
                        'text': cleaned,
                        'intent': tag,
                        'category': category,
                        'responses': responses,
                        'entities': entities,
                        'escalate': escalate,
                        'context': context,
                        'follow_up': follow_up,
                        'source': 'knowledge-data'
                    })
        
        return samples
    
    def load_intent_data(self, filepath: str) -> List[Dict[str, Any]]:
        """Load Intent.json format (GeniSys style)"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        samples = []
        intents = data.get('intents', [])
        
        for intent in intents:
            intent_name = intent.get('intent', '')
            texts = intent.get('text', [])
            responses = intent.get('responses', [])
            context = intent.get('context', {})
            entities = intent.get('entities', [])
            
            # Map GeniSys intent names to our standardized names
            mapped_intent = self._map_intent_name(intent_name)
            
            for text in texts:
                cleaned = self.preprocessor.clean_text(text)
                if len(cleaned) >= DATA_CONFIG.min_pattern_length:
                    samples.append({
                        'text': cleaned,
                        'intent': mapped_intent,
                        'category': 'conversation',
                        'responses': responses,
                        'entities': [{'entity': e.get('entity', ''), 'value': e.get('value', '')} 
                                    for e in entities if isinstance(e, dict)],
                        'escalate': False,
                        'context': context,
                        'follow_up': [],
                        'source': 'intent-json'
                    })
        
        return samples
    
    def _map_intent_name(self, genisys_intent: str) -> str:
        """Map GeniSys intent names to standardized names"""
        mapping = {
            'Greeting': 'greeting',
            'GreetingResponse': 'greeting',
            'CourtesyGreeting': 'greeting',
            'CourtesyGreetingResponse': 'greeting',
            'GoodBye': 'goodbye',
            'CourtesyGoodBye': 'goodbye',
            'Thanks': 'thanks',
            'Clever': 'thanks',
            'Shutup': 'frustrated',
            'Swearing': 'frustrated',
            'NotTalking2U': 'default_fallback',
            'TimeQuery': 'default_fallback',
            'NameQuery': 'default_fallback',
            'RealNameQuery': 'default_fallback',
            'CurrentHumanQuery': 'default_fallback',
            'WhoAmI': 'default_fallback',
            'UnderstandQuery': 'default_fallback',
            'SelfAware': 'default_fallback',
            'Jokes': 'default_fallback',
            'Gossip': 'default_fallback',
            'PodBayDoor': 'default_fallback',
            'PodBayDoorResponse': 'default_fallback',
        }
        return mapping.get(genisys_intent, 'default_fallback')


class DataProcessor:
    """Main data processing pipeline"""
    
    def __init__(self):
        self.preprocessor = TextPreprocessor()
        self.loader = DatasetLoader(self.preprocessor)
        self.intent_to_idx = {}
        self.idx_to_intent = {}
    
    def process(self) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """Full data processing pipeline"""
        print("=" * 60)
        print("IT Help Desk Chatbot - Data Processing Pipeline")
        print("=" * 60)
        
        # Step 1: Load datasets
        print("\n[1/6] Loading datasets...")
        knowledge_path = self._resolve_knowledge_path()
        knowledge_samples = self.loader.load_knowledge_data(knowledge_path)
        print(f"  - Loaded {len(knowledge_samples)} samples from knowledge-data.json")
        
        intent_samples = []
        if os.path.exists(DATA_CONFIG.intent_data_path):
            intent_samples = self.loader.load_intent_data(DATA_CONFIG.intent_data_path)
            print(f"  - Loaded {len(intent_samples)} samples from Intent.json")
        
        # Merge datasets
        all_samples = knowledge_samples + intent_samples
        print(f"  - Total samples: {len(all_samples)}")
        
        # Step 2: Remove duplicates
        print("\n[2/6] Removing duplicates...")
        all_samples = self._remove_duplicates(all_samples)
        print(f"  - After deduplication: {len(all_samples)} samples")
        
        # Step 3: Filter low-quality entries
        print("\n[3/6] Filtering low-quality entries...")
        all_samples = self._filter_low_quality(all_samples)
        print(f"  - After filtering: {len(all_samples)} samples")
        
        # Step 4: Data augmentation
        if DATA_CONFIG.use_augmentation:
            print("\n[4/6] Augmenting data...")
            all_samples = self._augment_data(all_samples)
            print(f"  - After augmentation: {len(all_samples)} samples")
        else:
            print("\n[4/6] Skipping augmentation (disabled)")
        
        # Step 5: Build intent mapping
        print("\n[5/6] Building intent mapping...")
        self._build_intent_mapping(all_samples)
        print(f"  - Total intents: {len(self.intent_to_idx)}")
        
        # Add intent indices to samples
        for sample in all_samples:
            sample['intent_idx'] = self.intent_to_idx[sample['intent']]
        
        # Step 6: Split data
        print("\n[6/6] Splitting data...")
        train, valid, test = self._split_data(all_samples)
        print(f"  - Train: {len(train)} samples")
        print(f"  - Valid: {len(valid)} samples")
        print(f"  - Test: {len(test)} samples")
        
        # Save processed data
        self._save_data(train, valid, test)
        
        # Print statistics
        self._print_statistics(all_samples)
        
        return train, valid, test

    def _resolve_knowledge_path(self) -> str:
        """Resolve knowledge-data.json path with fallbacks."""
        if os.path.exists(DATA_CONFIG.knowledge_data_path):
            return DATA_CONFIG.knowledge_data_path

        env_path = os.environ.get('CHATBOT_KNOWLEDGE_PATH')
        if env_path and os.path.exists(env_path):
            return env_path

        repo_root = os.path.abspath(os.path.join(BASE_DIR, '..', '..', '..'))
        fallback_path = os.path.join(
            repo_root,
            'frontend',
            'app',
            'knowledge-base',
            'knowledge-data.json',
        )
        if os.path.exists(fallback_path):
            return fallback_path

        raise FileNotFoundError(
            "knowledge-data.json not found. Set CHATBOT_KNOWLEDGE_PATH or place the file at "
            f"{DATA_CONFIG.knowledge_data_path} or {fallback_path}"
        )
    
    def _remove_duplicates(self, samples: List[Dict]) -> List[Dict]:
        """Remove duplicate text entries"""
        seen_texts = set()
        unique_samples = []
        
        for sample in samples:
            text_key = sample['text'].lower().strip()
            if text_key not in seen_texts:
                seen_texts.add(text_key)
                unique_samples.append(sample)
        
        return unique_samples
    
    def _filter_low_quality(self, samples: List[Dict]) -> List[Dict]:
        """Filter out low-quality entries"""
        filtered = []
        
        for sample in samples:
            text = sample['text']
            
            # Skip too short
            if len(text) < DATA_CONFIG.min_pattern_length:
                continue
            
            # Skip too long
            if len(text) > DATA_CONFIG.max_pattern_length:
                continue
            
            # Skip if mostly numbers/special chars
            alpha_ratio = sum(c.isalpha() for c in text) / max(len(text), 1)
            if alpha_ratio < 0.5:
                continue
            
            # Skip empty intents
            if not sample['intent']:
                continue
            
            filtered.append(sample)
        
        return filtered
    
    def _augment_data(self, samples: List[Dict]) -> List[Dict]:
        """Augment data with variations"""
        augmented = []
        
        # Count samples per intent
        intent_counts = Counter(s['intent'] for s in samples)
        max_count = max(intent_counts.values())
        
        for sample in samples:
            augmented.append(sample)
            
            # Augment underrepresented intents more
            intent_count = intent_counts[sample['intent']]
            num_augments = max(1, int(DATA_CONFIG.augmentation_factor * (max_count / intent_count) * 0.3))
            num_augments = min(num_augments, 5)  # Cap at 5 augments
            
            variations = self.preprocessor.augment_text(sample['text'], num_augments)
            
            for var_text in variations[1:]:  # Skip original
                aug_sample = sample.copy()
                aug_sample['text'] = var_text
                aug_sample['augmented'] = True
                augmented.append(aug_sample)
        
        return augmented
    
    def _build_intent_mapping(self, samples: List[Dict]) -> None:
        """Create intent to index mapping"""
        intents = sorted(set(s['intent'] for s in samples))
        
        self.intent_to_idx = {intent: idx for idx, intent in enumerate(intents)}
        self.idx_to_intent = {idx: intent for intent, idx in self.intent_to_idx.items()}
    
    def _split_data(self, samples: List[Dict]) -> Tuple[List[Dict], List[Dict], List[Dict]]:
        """Split data into train/valid/test sets (stratified by intent)"""
        random.shuffle(samples)
        
        # Group by intent for stratified split
        intent_groups = {}
        for sample in samples:
            intent = sample['intent']
            if intent not in intent_groups:
                intent_groups[intent] = []
            intent_groups[intent].append(sample)
        
        train, valid, test = [], [], []
        
        for intent, group in intent_groups.items():
            random.shuffle(group)
            n = len(group)
            
            n_train = max(1, int(n * DATA_CONFIG.train_ratio))
            n_valid = max(1, int(n * DATA_CONFIG.valid_ratio))
            
            train.extend(group[:n_train])
            valid.extend(group[n_train:n_train + n_valid])
            test.extend(group[n_train + n_valid:])
        
        # Shuffle final sets
        random.shuffle(train)
        random.shuffle(valid)
        random.shuffle(test)
        
        return train, valid, test
    
    def _save_data(self, train: List[Dict], valid: List[Dict], test: List[Dict]) -> None:
        """Save processed data to files"""
        # Save train/valid/test splits
        with open(DATA_CONFIG.train_path, 'w', encoding='utf-8') as f:
            json.dump(train, f, indent=2)
        
        with open(DATA_CONFIG.valid_path, 'w', encoding='utf-8') as f:
            json.dump(valid, f, indent=2)
        
        with open(DATA_CONFIG.test_path, 'w', encoding='utf-8') as f:
            json.dump(test, f, indent=2)
        
        # Save intent mapping
        intent_map = {
            'intent_to_idx': self.intent_to_idx,
            'idx_to_intent': self.idx_to_intent,
            'num_intents': len(self.intent_to_idx)
        }
        with open(DATA_CONFIG.intent_map_path, 'w', encoding='utf-8') as f:
            json.dump(intent_map, f, indent=2)
        
        print(f"\n✅ Data saved to {DATA_CONFIG.train_path}")
        print(f"✅ Data saved to {DATA_CONFIG.valid_path}")
        print(f"✅ Data saved to {DATA_CONFIG.test_path}")
        print(f"✅ Intent map saved to {DATA_CONFIG.intent_map_path}")
    
    def _print_statistics(self, samples: List[Dict]) -> None:
        """Print dataset statistics"""
        print("\n" + "=" * 60)
        print("Dataset Statistics")
        print("=" * 60)
        
        # Intent distribution
        intent_counts = Counter(s['intent'] for s in samples)
        print(f"\nIntent Distribution (Top 15):")
        for intent, count in intent_counts.most_common(15):
            bar = '█' * (count // 10)
            print(f"  {intent:25} {count:4} {bar}")
        
        # Category distribution
        category_counts = Counter(s.get('category', 'unknown') for s in samples)
        print(f"\nCategory Distribution:")
        for category, count in category_counts.most_common():
            print(f"  {category:15} {count:4}")
        
        # Text length statistics
        lengths = [len(s['text'].split()) for s in samples]
        print(f"\nText Length (words):")
        print(f"  Min: {min(lengths)}, Max: {max(lengths)}, Avg: {sum(lengths)/len(lengths):.1f}")
        
        # Source distribution  
        source_counts = Counter(s.get('source', 'unknown') for s in samples)
        print(f"\nData Source:")
        for source, count in source_counts.items():
            print(f"  {source}: {count}")


def main():
    """Run data preprocessing pipeline"""
    processor = DataProcessor()
    train, valid, test = processor.process()
    
    print("\n" + "=" * 60)
    print("✅ Data preprocessing complete!")
    print("=" * 60)
    print("\nNext step: Run 'python train.py' to train the model")


if __name__ == '__main__':
    main()
