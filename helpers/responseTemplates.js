const questions = require('./questions.json').questions;

module.exports = {

    buildQuestionResponseTemplate: function(index, oldForm) {
        let responseTemplate;

        if (questions[index]) {
            const question = questions[index];
            console.log('QUESTION----------', index, question)
    
            if (question.template_type === 'button') {
                responseTemplate = this.buttonTemplate(question, oldForm);
            } else if (question.template_type === 'quick_replies') {
                responseTemplate = this.quickRepliesTemplate(question, oldForm);
            } else {
                responseTemplate = {text: 'I am not sure how to do that yet...'}
            }
        } else {
            let responses = Object.keys(oldForm.form_data).map(key => {
                return `${key}: ${oldForm[key]}`
            })
            responses = responses.join(', ');
            responseTemplate = { text: `You have completed the form!  Here are your responses: ${responses}` }
        }

        return responseTemplate;
    },

    saveAnswer: function(oldForm, fieldName, fieldValue) {
        const questionNumber = oldForm.question_number;
        const newForm = {
            ...oldForm,
            question_number: questionNumber + 1
        };
        newForm.form_data[fieldName] = fieldValue;
        return JSON.stringify(newForm);
    },

    quickRepliesTemplate: function(question, oldForm) {
        const responseTemplate = {
            text: question.text,
            quick_replies: question.options.map(item => {
                return {
                    content_type: "text",
                    title: item.title,
                    payload: this.saveAnswer(oldForm, question.field, item.value),
                    image_url: item.image_url
                }
            })
        }

        return responseTemplate;
    },

    buttonTemplate: function(question, oldForm) {
        const responseTemplate = {
            attachment: {
                type: 'template',
                payload: {
                    template_type: question.template_type,
                    text: question.text,
                    buttons:  question.options.map(item => {
                        return {
                            type: 'postback',
                            title: item.title,
                            // postback payload must be a string
                            payload: this.saveAnswer(oldForm, question.field, item.value)
                        }
                    })
                }
            }
        }

        return responseTemplate;
    }
}

