from clearvoice import ClearVoice


cv = ClearVoice(task='speech_enhancement', model_names=['MossFormer2_SE_48K'])
cv(input_path='/Users/somnathmahato/hobby-projects/data/noise-samples/assets_noisy_snr0.wav', online_write=True, output_path='.')