let holidays = [];

// Load holidays on page load
document.addEventListener('DOMContentLoaded', function() {
    loadHolidays();
    loadHistory();
});

// Fetch holidays from API
async function loadHolidays() {
    try {
        const response = await fetch('/api/holidays');
        holidays = await response.json();
        
        const select = document.getElementById('holidaySelect');
        select.innerHTML = '<option value="" selected disabled>Choose a holiday...</option>';
        
        holidays.forEach(holiday => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                name: holiday.name,
                date: holiday.date
            });
            option.textContent = `${holiday.name} - ${holiday.date}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading holidays:', error);
        document.getElementById('holidaySelect').innerHTML = 
            '<option value="">Error loading holidays</option>';
    }
}

// Handle form submission
document.getElementById('holidayForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const selectValue = document.getElementById('holidaySelect').value;
    if (!selectValue) return;
    
    const holidayData = JSON.parse(selectValue);
    
    try {
        const response = await fetch('/api/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                holiday_name: holidayData.name,
                holiday_date: holidayData.date
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult(result);
            loadHistory();
        }
    } catch (error) {
        console.error('Error calculating days:', error);
    }
});

// Display result
function showResult(result) {
    const resultAlert = document.getElementById('resultAlert');
    const resultText = document.getElementById('resultText');
    
    let message = '';
    if (result.days_until > 0) {
        message = `There are <strong>${result.days_until} days</strong> until <strong>${result.holiday_name}</strong>!`;
    } else if (result.days_until === 0) {
        message = `<strong>${result.holiday_name}</strong> is <strong>TODAY</strong>! 🎉`;
    } else {
        message = `<strong>${result.holiday_name}</strong> was <strong>${Math.abs(result.days_until)} days ago</strong>.`;
    }
    
    resultText.innerHTML = message;
    resultAlert.style.display = 'block';
}

// Load search history
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const history = await response.json();
        
        const tbody = document.getElementById('historyTableBody');
        
        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-3">
                        No searches yet. Try calculating days until a holiday!
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = '';
        history.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.holiday_name}</strong></td>
                <td>${item.holiday_date}</td>
                <td>
                    <span class="badge ${item.days_until >= 0 ? 'bg-success' : 'bg-secondary'}">
                        ${item.days_until} days
                    </span>
                </td>
                <td><small class="text-muted">${item.searched_at}</small></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading history:', error);
    }
}