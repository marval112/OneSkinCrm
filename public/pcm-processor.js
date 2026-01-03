class PcmProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 4096; // Matching typical ScriptProcessor size
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputData = input[0];

            for (let i = 0; i < inputData.length; i++) {
                this.buffer[this.bufferIndex++] = inputData[i];

                if (this.bufferIndex >= this.bufferSize) {
                    // Convert buffer to Int16
                    const pcmData = new Int16Array(this.bufferSize);
                    for (let j = 0; j < this.bufferSize; j++) {
                        const sample = Math.max(-1, Math.min(1, this.buffer[j]));
                        pcmData[j] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                    }

                    // Send to main thread
                    this.port.postMessage(pcmData);

                    // Reset buffer
                    this.bufferIndex = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor('pcm-processor', PcmProcessor);
