"""
Ticket Classifier - Main API for classifying and routing tickets
This module provides the main interface for the ticket classification system
"""

import os
import numpy as np
import joblib
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from collections import deque
from datetime import datetime

# Import local modules
from neural_network import NeuralNetwork
from config import (
    AGENT_IDS, AGENT_SPECIALIZATIONS, TYPE_TO_PRIMARY_AGENT,
    SECONDARY_ASSIGNMENTS, MAX_TICKETS_PER_AGENT, PRIORITY_LEVELS,
    TICKET_TYPES, TICKET_STATUS, PRIORITY_ENCODING, TYPE_ENCODING,
    AGENT_ENCODING, AGENT_DECODING
)


@dataclass
class Ticket:
    """Represents a support ticket."""
    id: str
    priority: str  # 'low', 'medium', 'high'
    ticket_type: str  # 'software', 'hardware', 'network'
    status: str = TICKET_STATUS['OPEN']
    assigned_agent: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    neural_network_prediction: Optional[str] = None
    prediction_confidence: Optional[float] = None


class TicketClassifier:
    """
    Neural Network-based Ticket Classifier with intelligent routing.
    
    Uses a trained neural network to classify tickets and assigns them
    to agents based on the routing algorithm with FCFS queues.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the classifier.
        
        Args:
            model_path: Path to the trained model file
        """
        self.nn: Optional[NeuralNetwork] = None
        self.model_loaded = False
        
        # Agent workload tracking
        self.agent_tickets: Dict[str, List[str]] = {
            "Agent 1": [],
            "Agent 2": [],
            "Agent 3": [],
        }
        
        # Priority queues (FCFS)
        self.high_priority_queue: deque = deque()
        self.medium_priority_queue: deque = deque()
        self.low_priority_queue: deque = deque()
        
        # Ticket storage
        self.tickets: Dict[str, Ticket] = {}
        
        # Load model if path provided
        if model_path:
            self.load_model(model_path)
        else:
            # Try to load from default location
            default_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                'ticket_classifier_model.joblib'
            )
            if os.path.exists(default_path):
                self.load_model(default_path)
    
    def load_model(self, model_path: str) -> bool:
        """
        Load the trained model.
        
        Args:
            model_path: Path to the model file
            
        Returns:
            True if loaded successfully
        """
        try:
            model_data = joblib.load(model_path)
            
            # Recreate neural network
            self.nn = NeuralNetwork(
                input_size=model_data['input_size'],
                hidden1_size=model_data['hidden1_size'],
                hidden2_size=model_data['hidden2_size'],
                output_size=model_data['output_size']
            )
            self.nn.set_weights(model_data['weights'])
            self.model_loaded = True
            print(f"Model loaded successfully from {model_path}")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            self.model_loaded = False
            return False
    
    def _encode_input(self, priority: str, ticket_type: str) -> np.ndarray:
        """Encode priority and type for neural network input."""
        return np.array([[
            PRIORITY_ENCODING[priority.lower()] / 2.0,
            TYPE_ENCODING[ticket_type.lower()] / 2.0
        ]])
    
    def predict_agent(self, priority: str, ticket_type: str) -> Tuple[str, float, Dict[str, float]]:
        """
        Use neural network to predict the best agent.
        
        Args:
            priority: Ticket priority ('low', 'medium', 'high')
            ticket_type: Ticket type ('software', 'hardware', 'network')
            
        Returns:
            Tuple of (predicted_agent, confidence, all_probabilities)
        """
        if not self.model_loaded:
            raise RuntimeError("Model not loaded. Please load a trained model first.")
        
        # Encode input
        x = self._encode_input(priority, ticket_type)
        
        # Get prediction
        proba = self.nn.predict_proba(x)[0]
        prediction = self.nn.predict(x)[0]
        predicted_agent = AGENT_DECODING[prediction]
        confidence = float(proba[prediction])
        
        probabilities = {
            "Agent 1": float(proba[0]),
            "Agent 2": float(proba[1]),
            "Agent 3": float(proba[2]),
        }
        
        return predicted_agent, confidence, probabilities
    
    def get_agent_load(self, agent: str) -> int:
        """Get current ticket count for an agent."""
        return len(self.agent_tickets.get(agent, []))
    
    def is_agent_available(self, agent: str) -> bool:
        """Check if an agent has capacity for more tickets."""
        return self.get_agent_load(agent) < MAX_TICKETS_PER_AGENT
    
    def get_available_agents(self) -> List[str]:
        """Get list of agents with available capacity."""
        return [agent for agent in self.agent_tickets.keys() 
                if self.is_agent_available(agent)]
    
    def _get_queue_for_priority(self, priority: str) -> deque:
        """Get the appropriate queue for a priority level."""
        if priority == 'high':
            return self.high_priority_queue
        elif priority == 'medium':
            return self.medium_priority_queue
        else:
            return self.low_priority_queue
    
    def _find_available_agent(self, priority: str, ticket_type: str) -> Optional[str]:
        """
        Find an available agent using the routing algorithm.
        
        Priority:
        1. Primary agent by expertise (if available)
        2. Secondary agent by load distribution (if available)
        3. Any available agent (for non-high priority)
        4. None (stays in queue)
        """
        priority = priority.lower()
        ticket_type = ticket_type.lower()
        
        # Get primary agent for this type
        primary_agent = TYPE_TO_PRIMARY_AGENT.get(ticket_type)
        
        # Step 1: Try primary agent
        if primary_agent and self.is_agent_available(primary_agent):
            return primary_agent
        
        # Step 2: For high priority, only assign to specialist or wait
        if priority == 'high':
            return None  # Must wait for specialist
        
        # Step 3: Try secondary agents based on load distribution
        secondary_agents = SECONDARY_ASSIGNMENTS.get((priority, ticket_type), [])
        for agent in secondary_agents:
            if self.is_agent_available(agent):
                return agent
        
        # Step 4: Try any available agent (for medium/low priority)
        for agent in self.agent_tickets.keys():
            if self.is_agent_available(agent):
                return agent
        
        return None
    
    def create_ticket(self, ticket_id: str, priority: str, 
                      ticket_type: str) -> Dict[str, Any]:
        """
        Create and route a new ticket.
        
        Args:
            ticket_id: Unique ticket identifier
            priority: 'low', 'medium', or 'high'
            ticket_type: 'software', 'hardware', or 'network'
            
        Returns:
            Dictionary with ticket info and assignment result
        """
        priority = priority.lower()
        ticket_type = ticket_type.lower()
        
        # Validate inputs
        if priority not in PRIORITY_LEVELS:
            raise ValueError(f"Invalid priority: {priority}. Must be one of {PRIORITY_LEVELS}")
        if ticket_type not in TICKET_TYPES:
            raise ValueError(f"Invalid type: {ticket_type}. Must be one of {TICKET_TYPES}")
        
        # Get neural network prediction
        nn_prediction = None
        nn_confidence = None
        nn_probabilities = None
        
        if self.model_loaded:
            nn_prediction, nn_confidence, nn_probabilities = self.predict_agent(
                priority, ticket_type
            )
        
        # Create ticket
        ticket = Ticket(
            id=ticket_id,
            priority=priority,
            ticket_type=ticket_type,
            neural_network_prediction=nn_prediction,
            prediction_confidence=nn_confidence
        )
        
        # Store ticket
        self.tickets[ticket_id] = ticket
        
        # Try to assign immediately
        assigned_agent = self._find_available_agent(priority, ticket_type)
        
        if assigned_agent:
            # Assign ticket
            ticket.assigned_agent = assigned_agent
            ticket.assigned_agent_id = AGENT_IDS[assigned_agent]
            ticket.status = TICKET_STATUS['PENDING']
            self.agent_tickets[assigned_agent].append(ticket_id)
        else:
            # Add to queue
            queue = self._get_queue_for_priority(priority)
            queue.append(ticket_id)
            ticket.status = TICKET_STATUS['OPEN']
        
        return {
            'ticket_id': ticket_id,
            'priority': priority,
            'type': ticket_type,
            'status': ticket.status,
            'assigned_agent': ticket.assigned_agent,
            'assigned_agent_id': ticket.assigned_agent_id,
            'neural_network_prediction': nn_prediction,
            'prediction_confidence': nn_confidence,
            'prediction_probabilities': nn_probabilities,
            'queued': ticket.status == TICKET_STATUS['OPEN'],
        }
    
    def close_ticket(self, ticket_id: str) -> Dict[str, Any]:
        """
        Close a ticket and process queue.
        
        Args:
            ticket_id: ID of the ticket to close
            
        Returns:
            Dictionary with closure info and any newly assigned tickets
        """
        if ticket_id not in self.tickets:
            raise ValueError(f"Ticket {ticket_id} not found")
        
        ticket = self.tickets[ticket_id]
        
        if ticket.status == TICKET_STATUS['CLOSED']:
            return {'message': 'Ticket already closed', 'ticket_id': ticket_id}
        
        # Get the agent who was handling this ticket
        agent = ticket.assigned_agent
        
        # Close the ticket
        ticket.status = TICKET_STATUS['CLOSED']
        
        # Remove from agent's list
        if agent and ticket_id in self.agent_tickets[agent]:
            self.agent_tickets[agent].remove(ticket_id)
        
        # Process queues to assign waiting tickets
        newly_assigned = self._process_queues()
        
        return {
            'ticket_id': ticket_id,
            'status': TICKET_STATUS['CLOSED'],
            'freed_agent': agent,
            'newly_assigned_tickets': newly_assigned,
        }
    
    def _process_queues(self) -> List[Dict[str, Any]]:
        """
        Process queues and assign tickets to available agents.
        
        Returns:
            List of newly assigned tickets
        """
        newly_assigned = []
        
        # Process high priority first
        for queue in [self.high_priority_queue, self.medium_priority_queue, 
                      self.low_priority_queue]:
            tickets_to_remove = []
            
            for ticket_id in queue:
                ticket = self.tickets[ticket_id]
                agent = self._find_available_agent(ticket.priority, ticket.ticket_type)
                
                if agent:
                    # Assign ticket
                    ticket.assigned_agent = agent
                    ticket.assigned_agent_id = AGENT_IDS[agent]
                    ticket.status = TICKET_STATUS['PENDING']
                    self.agent_tickets[agent].append(ticket_id)
                    tickets_to_remove.append(ticket_id)
                    
                    newly_assigned.append({
                        'ticket_id': ticket_id,
                        'assigned_agent': agent,
                        'assigned_agent_id': AGENT_IDS[agent],
                    })
            
            # Remove assigned tickets from queue
            for ticket_id in tickets_to_remove:
                queue.remove(ticket_id)
        
        return newly_assigned
    
    def get_status(self) -> Dict[str, Any]:
        """Get current system status."""
        return {
            'model_loaded': self.model_loaded,
            'agent_workloads': {
                agent: {
                    'current_tickets': len(tickets),
                    'max_capacity': MAX_TICKETS_PER_AGENT,
                    'available': len(tickets) < MAX_TICKETS_PER_AGENT,
                    'ticket_ids': tickets,
                    'agent_id': AGENT_IDS[agent],
                    'specialization': AGENT_SPECIALIZATIONS[agent],
                }
                for agent, tickets in self.agent_tickets.items()
            },
            'queues': {
                'high_priority': list(self.high_priority_queue),
                'medium_priority': list(self.medium_priority_queue),
                'low_priority': list(self.low_priority_queue),
            },
            'total_tickets': len(self.tickets),
            'pending_in_queue': (
                len(self.high_priority_queue) + 
                len(self.medium_priority_queue) + 
                len(self.low_priority_queue)
            ),
        }
    
    def classify_ticket(self, priority: str, ticket_type: str) -> Dict[str, Any]:
        """
        Classify a ticket without creating it (prediction only).
        
        Args:
            priority: Ticket priority
            ticket_type: Ticket type
            
        Returns:
            Classification result with predicted agent and confidence
        """
        if not self.model_loaded:
            raise RuntimeError("Model not loaded")
        
        predicted_agent, confidence, probabilities = self.predict_agent(
            priority, ticket_type
        )
        
        return {
            'priority': priority,
            'type': ticket_type,
            'predicted_agent': predicted_agent,
            'predicted_agent_id': AGENT_IDS[predicted_agent],
            'confidence': confidence,
            'probabilities': probabilities,
            'specialization': AGENT_SPECIALIZATIONS[predicted_agent],
        }


# Convenience function for direct classification
def classify_and_route(priority: str, ticket_type: str, 
                       model_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to classify a ticket.
    
    Args:
        priority: Ticket priority ('low', 'medium', 'high')
        ticket_type: Ticket type ('software', 'hardware', 'network')
        model_path: Optional path to model file
        
    Returns:
        Classification result
    """
    classifier = TicketClassifier(model_path)
    return classifier.classify_ticket(priority, ticket_type)


if __name__ == "__main__":
    # Test the classifier
    print("Testing Ticket Classifier")
    print("=" * 50)
    
    classifier = TicketClassifier()
    
    if classifier.model_loaded:
        # Test classification
        test_cases = [
            ("high", "software"),
            ("high", "hardware"),
            ("high", "network"),
            ("medium", "software"),
            ("medium", "hardware"),
            ("medium", "network"),
            ("low", "software"),
            ("low", "hardware"),
            ("low", "network"),
        ]
        
        print("\nClassification Results:")
        print("-" * 50)
        for priority, ticket_type in test_cases:
            result = classifier.classify_ticket(priority, ticket_type)
            print(f"{priority:6s} | {ticket_type:8s} -> {result['predicted_agent']} "
                  f"(confidence: {result['confidence']:.3f})")
        
        print("\n" + "=" * 50)
        print("Testing Ticket Routing")
        print("=" * 50)
        
        # Create some test tickets
        tickets = [
            ("T001", "high", "software"),
            ("T002", "high", "hardware"),
            ("T003", "high", "network"),
            ("T004", "high", "network"),
            ("T005", "high", "software"),
            ("T006", "medium", "software"),
        ]
        
        for ticket_id, priority, ticket_type in tickets:
            result = classifier.create_ticket(ticket_id, priority, ticket_type)
            print(f"Ticket {ticket_id}: {priority} {ticket_type} -> "
                  f"{result['assigned_agent'] or 'QUEUED'}")
        
        print("\nSystem Status:")
        status = classifier.get_status()
        for agent, info in status['agent_workloads'].items():
            print(f"  {agent}: {info['current_tickets']}/{info['max_capacity']} tickets")
    else:
        print("Model not loaded. Please run train_model.py first.")
