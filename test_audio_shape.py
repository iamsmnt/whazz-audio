"""Debug script to check audio loading and processing"""

import sys
sys.path.insert(0, '/Users/somnathmahato/hobby-projects/whazz-audio/.venv/lib/python3.12/site-packages')

from df.enhance import enhance, init_df, load_audio, save_audio
import torch

# Load model
print("Loading model...")
model, df_state, _ = init_df(post_filter=True, log_level="WARNING")

# Load audio
audio_path = "/Users/somnathmahato/hobby-projects/data/noise-samples/noisy_data.wav"
print(f"\nLoading audio from: {audio_path}")
audio, info = load_audio(audio_path, sr=df_state.sr())

# Print audio info
print(f"\nAudio information:")
print(f"  Shape: {audio.shape}")
print(f"  Dtype: {audio.dtype}")
print(f"  Sample rate: {df_state.sr()}")
print(f"  Min value: {audio.min():.4f}")
print(f"  Max value: {audio.max():.4f}")
print(f"  Mean value: {audio.mean():.4f}")
print(f"  Is tensor: {torch.is_tensor(audio)}")

# Check if audio is normalized
if audio.abs().max() > 1.0:
    print(f"\n⚠️  WARNING: Audio is not normalized! Max abs value: {audio.abs().max():.4f}")
    print("  This might cause issues. Audio should be in [-1, 1] range.")

# Check number of channels
if audio.dim() == 1:
    print(f"\n⚠️  WARNING: Audio has only 1 dimension. Expected [channels, samples]")
    print("  Adding channel dimension...")
    audio = audio.unsqueeze(0)
    print(f"  New shape: {audio.shape}")

print(f"\nEnhancing audio...")
enhanced = enhance(model, df_state, audio)

print(f"\nEnhanced audio information:")
print(f"  Shape: {enhanced.shape}")
print(f"  Min value: {enhanced.min():.4f}")
print(f"  Max value: {enhanced.max():.4f}")
print(f"  Mean value: {enhanced.mean():.4f}")

# Save both versions
print(f"\nSaving files...")
save_audio("debug_original.wav", audio, df_state.sr())
save_audio("debug_enhanced.wav", enhanced, df_state.sr())

print("\n✓ Done! Compare debug_original.wav and debug_enhanced.wav")
