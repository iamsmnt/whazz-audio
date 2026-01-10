from df.enhance import enhance, init_df, load_audio, save_audio
from df.utils import download_file

if __name__ == "__main__":
    # Load default model
    print("Loading model...")
    model, df_state, _ = init_df(log_level="WARNING", log_file=None)

    # Download and open some audio file. You use your audio files here
    audio_path = "/Users/somnathmahato/hobby-projects/data/noise-samples/noisy_data.wav"
    print(f"Loading audio: {audio_path}")
    audio, info = load_audio(audio_path, sr=df_state.sr())

    # Convert stereo to mono if needed
    if audio.dim() > 1 and audio.shape[0] > 1:
        print(f"  Converting from {audio.shape[0]} channels to mono...")
        audio = audio.mean(dim=0, keepdim=True)  # Average both channels

    # Print audio information
    print(f"\nProcessed Audio Info:")
    print(f"  Shape: {audio.shape}")
    print(f"  Sample Rate: {df_state.sr()} Hz")
    print(f"  Duration: {audio.shape[-1] / df_state.sr():.2f} seconds")
    print(f"  Channels: {audio.shape[0] if audio.dim() > 1 else 1}")
    print(f"  Value Range: [{audio.min():.4f}, {audio.max():.4f}]")

    # Denoise the audio
    print("\nEnhancing audio...")
    enhanced = enhance(model, df_state, audio)

    print(f"\nEnhanced Audio Info:")
    print(f"  Shape: {enhanced.shape}")
    print(f"  Value Range: [{enhanced.min():.4f}, {enhanced.max():.4f}]")

    # Save for listening
    print("\nSaving enhanced audio...")
    save_audio("enhanced_new.wav", enhanced, df_state.sr())
    print("✓ Saved to enhanced.wav")