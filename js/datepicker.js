// Date picker management with Flatpickr

export class DatePickerManager {
    constructor() {
        this.pickers = [];
    }

    // Initialize date pickers for start and end date inputs
    init() {
        // Destroy existing pickers to avoid duplicates
        this.destroy();

        const startDateInput = document.getElementById('form-date');
        const endDateInput = document.getElementById('form-endDate');

        if (startDateInput) {
            const startPicker = flatpickr(startDateInput, {
                locale: 'hu',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'Y. F j. (l)',
                allowInput: true,
                weekNumbers: true,
                firstDayOfWeek: 1, // Monday
                monthSelectorType: 'static',
                onChange: (selectedDates, dateStr) => {
                    // Update end date minimum to selected start date
                    if (endDateInput && endDateInput._flatpickr) {
                        endDateInput._flatpickr.set('minDate', dateStr);
                    }
                }
            });
            this.pickers.push(startPicker);
        }

        if (endDateInput) {
            const endPicker = flatpickr(endDateInput, {
                locale: 'hu',
                dateFormat: 'Y-m-d',
                altInput: true,
                altFormat: 'Y. F j. (l)',
                allowInput: true,
                weekNumbers: true,
                firstDayOfWeek: 1, // Monday
                monthSelectorType: 'static',
                minDate: startDateInput?.value || null
            });
            this.pickers.push(endPicker);
        }
    }

    // Destroy all active date pickers
    destroy() {
        this.pickers.forEach(picker => {
            if (picker && picker.destroy) {
                picker.destroy();
            }
        });
        this.pickers = [];
    }
}
