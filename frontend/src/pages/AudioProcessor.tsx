import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileAudio, Download, Loader2, CheckCircle2, XCircle, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';

interface ProcessingType {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const processingTypes: ProcessingType[] = [
  {
    id: 'speech_enhancement',
    label: 'Speech Enhancement',
    description: 'Remove background noise and enhance voice clarity',
    icon: '🎙️',
  },
  {
    id: 'speaker_separation',
    label: 'Speaker Separation',
    description: 'Separate multiple speakers into individual tracks',
    icon: '👥',
  },
  {
    id: 'music_separation',
    label: 'Music Separation',
    description: 'Isolate vocals, drums, bass, and other instruments',
    icon: '🎵',
  },
  {
    id: 'noise_reduction',
    label: 'Noise Reduction',
    description: 'Clean audio by removing unwanted noise',
    icon: '🔇',
  },
];

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface JobInfo {
  job_id: string;
  status: JobStatus;
  progress: number;
  filename: string;
  original_filename: string;
  error_message?: string;
  processing_type?: string;
}

export default function AudioProcessor() {
  const { isAuthenticated } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('speech_enhancement');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('AudioProcessor mounted');
  }, []);

  // Helper function to get appropriate headers based on authentication
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (isAuthenticated) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      let guestId = localStorage.getItem('guestId');
      if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem('guestId', guestId);
      }
      headers['X-Guest-ID'] = guestId;
    }

    return headers;
  }, [isAuthenticated]);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/audio/status/${jobId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const data = await response.json();
      setJobInfo(data);

      if (data.status === 'completed' || data.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    } catch (err) {
      console.error('Error polling job status:', err);
      setError('Failed to fetch job status');
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (jobInfo && (jobInfo.status === 'pending' || jobInfo.status === 'processing')) {
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(jobInfo.job_id);
      }, 2000);

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [jobInfo, pollJobStatus]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('audio/')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please drop a valid audio file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/audio/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();
      setJobInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!jobInfo || jobInfo.status !== 'completed') return;

    try {
      const response = await fetch(`http://localhost:8000/audio/download/${jobInfo.job_id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${jobInfo.original_filename}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download file');
    }
  };

  const handleReset = () => {
    setFile(null);
    setJobInfo(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case 'pending':
        return 'text-amber-600';
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-emerald-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'failed':
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-teal-50 overflow-hidden flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-200/20 rounded-full blur-2xl"></div>
        </div>

        {/* Main Content */}
        <div className="h-full flex flex-col p-6 relative z-10">
          <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
            {/* Main Grid: Processing Types (Left) + Upload (Right) */}
            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
              {/* Left Pane - Processing Type Selection */}
              <Card className="bg-white/80 backdrop-blur-xl border border-teal-100 shadow-xl flex flex-col overflow-hidden rounded-2xl">
                <CardHeader className="pb-3 border-b border-teal-100">
                  <CardTitle className="text-slate-800 flex items-center gap-2 text-xl font-bold">
                    <Music className="w-5 h-5 text-teal-600" />
                    Choose Processing Type
                  </CardTitle>
                  <CardDescription className="text-slate-600 text-sm font-medium">
                    Select how you want to transform your audio
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto pt-4">
                  <RadioGroup value={selectedType} onValueChange={setSelectedType} className="grid grid-cols-1 gap-3">
                    {processingTypes.map((type) => (
                      <div key={type.id} className="relative">
                        <RadioGroupItem
                          value={type.id}
                          id={type.id}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={type.id}
                          className={`
                            flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all font-medium
                            ${selectedType === type.id
                              ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-400 shadow-md'
                              : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
                            }
                          `}
                        >
                          <span className="text-2xl">{type.icon}</span>
                          <div className="flex-1">
                            <span className="font-bold text-base block text-slate-800">{type.label}</span>
                            <span className={`text-xs mt-1 block ${selectedType === type.id ? 'text-slate-700' : 'text-slate-500'}`}>
                              {type.description}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Right Pane - File Upload */}
              <Card className="bg-white/80 backdrop-blur-xl border border-teal-100 shadow-xl flex flex-col overflow-hidden rounded-2xl">
                <CardHeader className="pb-3 border-b border-teal-100">
                  <CardTitle className="text-slate-800 flex items-center gap-2 text-xl font-bold">
                    <Upload className="w-5 h-5 text-teal-600" />
                    Upload Audio File
                  </CardTitle>
                  <CardDescription className="text-slate-600 text-sm font-medium">
                    Drop your audio file here or click to browse
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto pt-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`
                      flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex items-center justify-center
                      ${isDragging
                        ? 'border-teal-400 bg-teal-50/50 shadow-lg'
                        : 'border-slate-300 hover:border-teal-300 bg-slate-50/50 hover:bg-teal-50/30'
                      }
                    `}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="space-y-4">
                      {file ? (
                        <>
                          <FileAudio className="w-16 h-16 mx-auto text-teal-600" strokeWidth={2} />
                          <div>
                            <p className="text-slate-800 font-bold text-lg">{file.name}</p>
                            <p className="text-slate-600 text-sm mt-1 font-medium">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="w-16 h-16 mx-auto text-slate-400" strokeWidth={2} />
                          <div>
                            <p className="text-slate-700 font-bold text-base">Drop your audio file here</p>
                            <p className="text-slate-500 text-sm mt-1 font-medium">or click to browse</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {error && (
                    <Alert className="bg-red-50 border border-red-200 py-3 rounded-xl">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <AlertDescription className="text-red-700 text-sm font-medium">{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleUpload}
                      disabled={!file || isUploading || !!jobInfo}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold py-5 text-base rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" />
                          Start Processing
                        </>
                      )}
                    </Button>

                    {jobInfo && (
                      <Button
                        onClick={handleReset}
                        className="border-2 border-teal-500 text-teal-600 hover:bg-teal-50 bg-white px-6 font-bold rounded-xl"
                      >
                        New File
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar - Below Grid */}
            {jobInfo && (
              <Card className="bg-white/80 backdrop-blur-xl border border-teal-100 shadow-xl mt-6 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-5">
                    {/* Status Icon */}
                    <div className={`flex items-center justify-center ${getStatusColor(jobInfo.status)}`}>
                      {getStatusIcon(jobInfo.status)}
                    </div>

                    {/* Progress Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold capitalize text-base ${getStatusColor(jobInfo.status)}`}>
                            {jobInfo.status}
                          </span>
                          <span className="text-slate-400 font-bold">•</span>
                          <span className="text-slate-700 text-sm truncate max-w-md font-medium">{jobInfo.original_filename}</span>
                        </div>
                        <span className="text-teal-600 font-bold text-lg">{Math.round(jobInfo.progress)}%</span>
                      </div>
                      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 transition-all duration-300 shadow-sm"
                          style={{ width: `${jobInfo.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Download Button */}
                    {jobInfo.status === 'completed' && (
                      <Button
                        onClick={handleDownload}
                        className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold py-4 px-8 shadow-lg hover:shadow-xl rounded-xl"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        Download
                      </Button>
                    )}

                    {/* Error Message */}
                    {jobInfo.status === 'failed' && jobInfo.error_message && (
                      <Alert className="bg-red-50 border border-red-200 py-3 px-4 flex-1 rounded-xl">
                        <AlertDescription className="text-red-700 text-sm font-medium">
                          {jobInfo.error_message || 'Processing failed'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
