class AgentError(RuntimeError):
    status_code = 500
    public_message = "Agent request failed"


class ConfigurationError(AgentError):
    status_code = 503
    public_message = "Agent runtime is not configured"


class DependencyUnavailableError(AgentError):
    status_code = 503
    public_message = "Required dependency is unavailable"


class MissingResourceError(AgentError):
    status_code = 409

    def __init__(self, public_message: str) -> None:
        super().__init__(public_message)
        self.public_message = public_message


class UpstreamDependencyError(AgentError):
    status_code = 502
    public_message = "Upstream dependency failed"
