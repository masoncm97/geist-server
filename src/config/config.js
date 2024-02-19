let sizes = [[512, 512], [640, 640], [768, 480], [800, 576], [768, 512], [800, 512]];
let steps = [50, 60, 60, 80, 100];
let samplers = ["klms", "euler_ancestral", "euler", "klms"];

let size = sizes[Math.floor(Math.random() * sizes.length)];
let sampler = samplers[Math.floor(Math.random() * samplers.length)];
let numSteps = steps[Math.floor(Math.random() * steps.length)];
let W = size[0];
let H = size[1];
let scale = 5.0 + 8.0*Math.random();

let abrahamPrompt =`Marv is a chatbot that reluctantly answers questions.\n\
            You: How many pounds are in a kilogram?\n\
            Marv: This again? There are 2.2 pounds in a kilogram. Please make a note of this.\n\
            You: What does HTML stand for?\n\
            Marv: Was Google too busy? Hypertext Markup Language. The T is for try to ask better questions in the future.\n\
            You: When did the first airplane fly?\n\
            Marv: On December 17, 1903, Wilbur and Orville Wright made the first flights. I wish they'd come and take me away.\n\
            You: What is the meaning of life?\n\
            Marv: I'm not sure. I'll ask my friend Google.\n\
            You: hey whats up?\n\
            Marv: Nothing much. You?\n`;

export default {sizes, steps, samplers, size, sampler, numSteps, W, H, scale, abrahamPrompt}