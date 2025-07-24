module.exports = {
    apps: [{
      name: 'huddle-ai-agents',
      script: 'agent.js',
      instances: process.env.NODE_ENV === 'production' ? 5 : 1,
      exec_mode: 'fork', // Fork mode for AI agents to handle individual connections
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Logging
      log_file: './logs/agents.log',
      out_file: './logs/agents-out.log',
      error_file: './logs/agents-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart configuration
      max_restarts: 15,
      min_uptime: '30s',
      max_memory_restart: '512M',
      
      // Monitoring
      monitor: true,
      
      // Graceful shutdown
      kill_timeout: 15000,
      listen_timeout: 10000,
      
      // Health check
      health_check_grace_period: 10000,
      
      // Resource limits
      node_args: '--max_old_space_size=512',
      
      // Error handling
      autorestart: true,
      watch: false,
      
      // Agent-specific settings
      merge_logs: true,
      shutdown_with_message: true,
      
      // Restart delay for failed agents
      restart_delay: 5000,
      
      // Environment variables for agent scaling
      increment_var: 'AGENT_INSTANCE_ID'
    }]
  };