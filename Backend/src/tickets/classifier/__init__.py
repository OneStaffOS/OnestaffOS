"""
Ticket Classifier Package
Neural network-based ticket classification and routing system
"""

from .classifier import TicketClassifier, classify_and_route, Ticket
from .neural_network import NeuralNetwork
from .config import AGENT_IDS, AGENT_SPECIALIZATIONS, MAX_TICKETS_PER_AGENT

__all__ = [
    'TicketClassifier',
    'classify_and_route',
    'Ticket',
    'NeuralNetwork',
    'AGENT_IDS',
    'AGENT_SPECIALIZATIONS',
    'MAX_TICKETS_PER_AGENT',
]

__version__ = '1.0.0'
