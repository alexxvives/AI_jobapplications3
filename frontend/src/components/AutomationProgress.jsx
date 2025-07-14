import { useState, useEffect } from 'react';

function AutomationProgress({ sessionId, onComplete, onError }) {
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    completed: 0,
    failed: 0,
    status: 'pending',
    currentJob: null,
    message: 'Initializing automation...'
  });

  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionId) {
      setIsActive(true);
      startProgressTracking();
    }
  }, [sessionId]);

  const startProgressTracking = async () => {
    try {
      // Start session
      const response = await fetch(`http://localhost:8000/automation/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to start automation session');
      }

      const result = await response.json();
      updateProgress(result);

      // Start polling for updates
      startPolling();

    } catch (err) {
      setError(err.message);
      if (onError) onError(err);
    }
  };

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8000/automation/sessions/${sessionId}/status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to get session status');
        }

        const status = await response.json();
        updateProgress(status);

        // Stop polling if completed or failed
        if (status.status === 'completed' || status.status === 'cancelled' || status.status === 'failed') {
          clearInterval(pollInterval);
          setIsActive(false);
          
          if (onComplete) {
            onComplete(status);
          }
        }

      } catch (err) {
        console.error('Error polling session status:', err);
        clearInterval(pollInterval);
        setError(err.message);
        if (onError) onError(err);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  };

  const updateProgress = (data) => {
    setProgress(prev => ({
      ...prev,
      current: data.progress?.current || 0,
      total: data.progress?.total || 0,
      completed: data.progress?.completed || 0,
      failed: data.progress?.failed || 0,
      status: data.status || 'pending',
      currentJob: data.current_job || prev.currentJob,
      message: getStatusMessage(data)
    }));
  };

  const getStatusMessage = (data) => {
    switch (data.status) {
      case 'pending':
        return 'Preparing automation session...';
      case 'in_progress':
        return data.current_job ? 
          `Processing: ${data.current_job.job_title} at ${data.current_job.company_name}` :
          'Processing job applications...';
      case 'waiting_for_submission':
        return 'Form filled. Waiting for submission...';
      case 'completed':
        return `All jobs completed! ${data.progress?.completed || 0} successful, ${data.progress?.failed || 0} failed.`;
      case 'cancelled':
        return 'Automation session cancelled.';
      case 'failed':
        return 'Automation session failed.';
      default:
        return 'Processing...';
    }
  };

  const cancelAutomation = async () => {
    try {
      const response = await fetch(`http://localhost:8000/automation/sessions/${sessionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel automation');
      }

      setIsActive(false);
      setProgress(prev => ({
        ...prev,
        status: 'cancelled',
        message: 'Automation cancelled by user'
      }));

    } catch (err) {
      setError(err.message);
    }
  };

  const getProgressPercentage = () => {
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500';
      case 'in_progress':
      case 'waiting_for_submission':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!sessionId) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          🤖 Automation Progress
        </h2>
        {isActive && (
          <button
            onClick={cancelAutomation}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progress.current} / {progress.total} jobs</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{getProgressPercentage()}% complete</span>
          <span>
            ✅ {progress.completed} completed, ❌ {progress.failed} failed
          </span>
        </div>
      </div>

      {/* Status Message */}
      <div className="mb-4">
        <p className="text-sm text-gray-700">{progress.message}</p>
      </div>

      {/* Current Job Details */}
      {progress.currentJob && (
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          <h3 className="font-medium text-gray-900 mb-2">Current Job</h3>
          <div className="text-sm text-gray-600">
            <p><strong>Title:</strong> {progress.currentJob.job_title}</p>
            <p><strong>Company:</strong> {progress.currentJob.company_name}</p>
            <p><strong>Status:</strong> {progress.currentJob.status}</p>
            {progress.currentJob.job_url && (
              <p>
                <strong>URL:</strong> 
                <a 
                  href={progress.currentJob.job_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 ml-1"
                >
                  View Job
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Automation Statistics */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 rounded-md p-3">
          <div className="text-2xl font-bold text-blue-600">{progress.total}</div>
          <div className="text-sm text-blue-600">Total Jobs</div>
        </div>
        <div className="bg-green-50 rounded-md p-3">
          <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
        <div className="bg-red-50 rounded-md p-3">
          <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
          <div className="text-sm text-red-600">Failed</div>
        </div>
      </div>

      {/* Chrome Extension Notice */}
      {progress.status === 'in_progress' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <div className="text-yellow-400 mr-3">⚠️</div>
            <div>
              <p className="text-sm text-yellow-800 font-medium">Chrome Extension Required</p>
              <p className="text-xs text-yellow-700 mt-1">
                Make sure the AI Job Assistant Chrome extension is installed and active. 
                The extension will automatically fill forms and detect submissions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completion Message */}
      {progress.status === 'completed' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start">
            <div className="text-green-400 mr-3">🎉</div>
            <div>
              <p className="text-sm text-green-800 font-medium">Automation Complete!</p>
              <p className="text-xs text-green-700 mt-1">
                All job applications have been processed. Check your email for application confirmations.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AutomationProgress;