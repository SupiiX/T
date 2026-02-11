// File upload and download handling

export class FileHandler {
    constructor(state) {
        this.state = state;
        this.fileInput = null;
        this.setupFileInput();
    }

    setupFileInput() {
        // Create hidden file input element
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json';
        this.fileInput.style.display = 'none';
        this.fileInput.addEventListener('change', this.handleUpload.bind(this));
        document.body.appendChild(this.fileInput);
    }

    triggerUpload() {
        this.fileInput.click();
    }

    handleUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        this.state.update('fileName', file.name);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                this.state.loadData(data);
            } catch (error) {
                alert('Hibás JSON fájl. Kérlek tölts fel egy érvényes naptár JSON-t.');
                console.error('JSON parse error:', error);
            }
        };
        reader.readAsText(file);

        // Reset input so same file can be uploaded again
        e.target.value = '';
    }

    downloadJSON() {
        const output = this.state.data.semester
            ? {
                semester: this.state.data.semester,
                categories: this.state.data.categories,
                events: this.state.data.events
            }
            : {
                categories: this.state.data.categories,
                events: this.state.data.events
            };

        const data = JSON.stringify(output, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.state.data.fileName || 'naptar.json';
        a.click();
        URL.revokeObjectURL(url);
    }
}
