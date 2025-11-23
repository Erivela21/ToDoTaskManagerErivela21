"""
Monitoring and metrics collection for the Task Manager API.
Tracks request counts, latency, and errors for observability.
"""
from datetime import datetime
from functools import wraps
import time


class MetricsCollector:
    """Collects and stores application metrics."""
    
    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.request_latencies = []
        self.endpoint_metrics = {}
        self.start_time = datetime.now()
    
    def record_request(self, endpoint, method, latency, status_code):
        """Record a request with its metrics."""
        self.request_count += 1
        
        # Track latencies (keep last 1000 for memory efficiency)
        self.request_latencies.append(latency)
        if len(self.request_latencies) > 1000:
            self.request_latencies.pop(0)
        
        # Track errors (4xx and 5xx)
        if status_code >= 400:
            self.error_count += 1
        
        # Track per-endpoint metrics
        key = f"{method} {endpoint}"
        if key not in self.endpoint_metrics:
            self.endpoint_metrics[key] = {
                'count': 0,
                'errors': 0,
                'total_latency': 0
            }
        
        self.endpoint_metrics[key]['count'] += 1
        self.endpoint_metrics[key]['total_latency'] += latency
        if status_code >= 400:
            self.endpoint_metrics[key]['errors'] += 1
    
    def get_average_latency(self):
        """Calculate average request latency in milliseconds."""
        if not self.request_latencies:
            return 0
        return sum(self.request_latencies) / len(self.request_latencies)
    
    def get_uptime_seconds(self):
        """Get application uptime in seconds."""
        return (datetime.now() - self.start_time).total_seconds()
    
    def get_metrics_summary(self):
        """Get a summary of all collected metrics."""
        return {
            'request_count': self.request_count,
            'error_count': self.error_count,
            'error_rate': self.error_count / self.request_count if self.request_count > 0 else 0,
            'average_latency_ms': round(self.get_average_latency(), 2),
            'uptime_seconds': round(self.get_uptime_seconds(), 2),
            'endpoints': {
                endpoint: {
                    'count': metrics['count'],
                    'errors': metrics['errors'],
                    'avg_latency_ms': round(metrics['total_latency'] / metrics['count'], 2)
                }
                for endpoint, metrics in self.endpoint_metrics.items()
            }
        }


# Global metrics collector instance
metrics_collector = MetricsCollector()


def track_metrics(f):
    """Decorator to track metrics for Flask routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        response = f(*args, **kwargs)
        latency = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Extract status code from response
        if isinstance(response, tuple):
            status_code = response[1] if len(response) > 1 else 200
        else:
            status_code = 200
        
        # Record metrics
        from flask import request
        metrics_collector.record_request(
            endpoint=request.endpoint or 'unknown',
            method=request.method,
            latency=latency,
            status_code=status_code
        )
        
        return response
    
    return decorated_function
