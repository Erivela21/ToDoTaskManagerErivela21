"""
Configuration settings for the Task Manager application.
This centralizes all configuration to avoid hardcoded values throughout the codebase.
"""
import os

class Config:
    """Base configuration class with default values."""
    
    # Server configuration
    HOST = os.environ.get('TASK_API_HOST', '0.0.0.0')
    PORT = int(os.environ.get('TASK_API_PORT', '5000'))
    DEBUG = os.environ.get('TASK_API_DEBUG', '1') == '1'
    
    # Data storage configuration
    DATA_FILE = os.environ.get('TASK_DATA_FILE', 'tasks.json')
    DATA_DIR = os.path.dirname(__file__)
    DATA_PATH = os.path.join(DATA_DIR, DATA_FILE)
    
    # Application metadata
    APP_NAME = 'Task Manager API'
    APP_VERSION = '1.0.0'
    
    # CORS configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    
    # Metrics configuration
    ENABLE_METRICS = os.environ.get('ENABLE_METRICS', '1') == '1'


class DevelopmentConfig(Config):
    """Development environment configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production environment configuration."""
    DEBUG = False


class TestConfig(Config):
    """Testing environment configuration."""
    DEBUG = True
    DATA_FILE = 'test_tasks.json'


# Configuration selector
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestConfig,
    'default': DevelopmentConfig
}


def get_config(env=None):
    """Get configuration based on environment."""
    if env is None:
        env = os.environ.get('FLASK_ENV', 'default')
    return config.get(env, config['default'])
