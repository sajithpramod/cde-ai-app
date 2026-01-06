const $ = (id) => document.getElementById(id);
export function validateMandatoryFields(){
    let valid = true; // <-- use let, and update if needed
    const subclusterSection = document.getElementById('subclusterteaxtarea');
    const commentInput = document.getElementById('comment');
    const commentFeedback = commentInput?.nextElementSibling;
    console.log("✅ validateMandatoryFields called"); 
    if (!subclusterSection.classList.contains('hidden') && !subclusterSection.classList.contains('d-none')) {
        if (!commentInput.value.trim()) {
            commentInput.classList.add('is-invalid');
            commentFeedback.style.display = 'block';
            valid = false; // <-- 🔧 This was missing
        } else {
            commentInput.classList.remove('is-invalid');
            commentFeedback.style.display = 'none';
        }
  
        commentInput.addEventListener('input', () => {
            commentInput.classList.remove('is-invalid');
            commentFeedback.style.display = 'none';
        });
    }
  
    const select = document.getElementById('forecastDuration');
    const value = select.value;
    const error = select.nextElementSibling;
  
    if (!value) {
        select.classList.add('is-invalid');
        if (error) error.style.display = 'block';
        valid = false;
    } else {
        select.classList.remove('is-invalid');
        if (error) error.style.display = 'none';
    }
  
    return valid;
}

export function validateCagrInput(data) {
    const errors = [];
    console.error(data);
    // Validate cagrData array
    if (!Array.isArray(data.cagrData) || data.cagrData.length === 0) {
        errors.push("cagrData must be a non-empty array.");
    } else {
        data.cagrData.forEach((item, index) => {
            const { tier, cagr } = item;

            if (typeof tier !== 'string' || tier.trim() === '') {
                errors.push(`Item ${index}: 'tier' must be a non-empty string.`);
            }

            const cagrNumber = Number(cagr);
            if (isNaN(cagrNumber) || cagrNumber < 0) {
                errors.push(`Item ${index}: 'cagr' must be a non-negative number.`);
            } else if (cagrNumber > 100) {
                errors.push(`Item ${index}: 'cagr' must be less than or equal to 100.`);
            }
        });
    }

    // Validate commentInput
    if ('commentInput' in data && data.commentInput !== null && data.commentInput !== undefined) {
        if (typeof data.commentInput !== 'string') {
            errors.push("commentInput must be a string if provided.");
        } else {
            // Optional: trim and sanitize here
            data.commentInput = data.commentInput.trim();
        }
    }

    // Validate selectedGrowthType
    const validGrowthTypes = ['CAGR', 'YOY']; // Add valid types here
    if (!validGrowthTypes.includes(data.selectedGrowthType)) {
        errors.push(`selectedGrowthType must be one of: ${validGrowthTypes.join(', ')}.`);
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}


export function scrollToFirstError() {
    const firstInvalidInput =
      document.querySelector('input.is-invalid, select.is-invalid, textarea.is-invalid') ||
      document.querySelector('.invalid-feedback:not(.d-none)');
  
    if (firstInvalidInput) {
        const input = firstInvalidInput.closest('input, select, textarea');
        if (input) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            input.focus({ preventScroll: true });
  
            // Optional: highlight for visibility
            input.classList.add('flash-error');
            setTimeout(() => input.classList.remove('flash-error'), 2000);
        }
    }
}
export function blockInvalidInput(e) {
    const invalidKeys = ['e', 'E', '+', '-', '.'];
    if (invalidKeys.includes(e.key)) {
        e.preventDefault();
        return false;
    }
}

export function validateRankInputs(sectionId) {
    const section = $(sectionId);
    if (!section || section.classList.contains('hidden') || section.classList.contains('d-none')) return true;
  
    const rankInputs = section.querySelectorAll('.rank-input');
    let valid = true;
    const seenRanks = new Map();
    const rankValues = [];
  
    rankInputs.forEach(input => {
        const feedback = input.parentElement.querySelector('.invalid-feedback');
        const value = input.value.trim();
        const rank = parseInt(value, 10);
  
        input.classList.remove('is-invalid');
        feedback.style.display = 'none';
  
        if (!value || !Number.isInteger(rank) || rank < 1 || rank > rankInputs.length) {
            input.classList.add('is-invalid');
            feedback.textContent = `Rank must be a number between 1 and ${rankInputs.length}`;
            feedback.style.display = 'block';
            valid = false;
        } else {
            rankValues.push({ rank, input, feedback });
            seenRanks.set(rank, (seenRanks.get(rank) || 0) + 1);
        }
  
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            feedback.style.display = 'none';
        });
  
    });
  
    rankValues.forEach(({ rank, input, feedback }) => {
        if (seenRanks.get(rank) > 1) {
            input.classList.add('is-invalid');
            feedback.textContent = `Rank ${rank} is duplicated. Each rank must be unique.`;
            feedback.style.display = 'block';
            valid = false;
        }
    });
  
  
    return valid;
}
  