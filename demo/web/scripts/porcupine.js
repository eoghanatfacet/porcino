let porcupine = null;
let rhino = null;

window.addEventListener("load", function () {
  let usingBuiltIns = false;
  if (
    porcupineKeywords.length === 0 &&
    porcupineModel.publicPath.endsWith("porcupine_params.pv")
  ) {
    usingBuiltIns = true;
    for (const k in PorcupineWeb.BuiltInKeyword) {
      porcupineKeywords.push(k);
    }
  }

  let select = document.getElementById("keywords");
  for (let i = 0; i < porcupineKeywords.length; i++) {
    let el = document.createElement("option");
    el.textContent = usingBuiltIns
      ? PorcupineWeb.BuiltInKeyword[porcupineKeywords[i]]
      : porcupineKeywords[i].label;
    el.value = `${i}`;
    select.appendChild(el);
  }
});

function writeMessage(message, bold = false) {
  console.log(message);
  let p = document.createElement("p");
  let text = document.createTextNode(message);

  if (bold) {
    let b = document.createElement("b");
    b.appendChild(text);
    text = b;
  }

  p.appendChild(text);
  let msgElement = document.getElementById("messages")
  msgElement.appendChild(p);
}

function rhinoInferenceCallback(inference) {
  if (inference.isFinalized) {
    writeMessage(`Inference detected: ${JSON.stringify(inference)}`, true);
    if (rhino) {
      window.WebVoiceProcessor.WebVoiceProcessor.unsubscribe(rhino);
      console.log("rhino released");
    }

    window.WebVoiceProcessor.WebVoiceProcessor.subscribe(porcupine);
    console.log("porcupine subscribed");

  }
}



function porcupineErrorCallback(error) {
  writeMessage(error);
}

function porcupineKeywordCallback(detection) {
  const time = new Date();
  const message = `keyword detected at ${time.toLocaleTimeString()}: ${detection.label} (index = ${detection.index})`;
  console.log(message);
  writeMessage(message);
  window.WebVoiceProcessor.WebVoiceProcessor.unsubscribe(porcupine);
  console.log("porcupine released");

  if (rhino) {
    writeMessage("Rhino is listening for your commands ...");
    window.WebVoiceProcessor.WebVoiceProcessor.subscribe(rhino);  
    console.log("rhino subscribed");
  }
}

async function stopAllPico(){
  await window.WebVoiceProcessor.WebVoiceProcessor.reset();
  writeMessage("Reset all PicoVoice animals!");
}

async function startPorcupine(accessKey, keywordIndex) {
  if (window.WebVoiceProcessor.WebVoiceProcessor.isRecording) {
    await window.WebVoiceProcessor.WebVoiceProcessor.unsubscribe(porcupine);
    await window.WebVoiceProcessor.WebVoiceProcessor.unsubscribe(rhino);
    await porcupine.terminate();
    await rhino.terminate();
  }

  writeMessage("Porcupine is loading. Please wait...");
  try {
    porcupine = await PorcupineWeb.PorcupineWorker.create(
      accessKey,
      [porcupineKeywords[keywordIndex]],
      porcupineKeywordCallback,
      porcupineModel,
    );

    writeMessage("Porcupine worker ready!");

    writeMessage(
      "WebVoiceProcessor initializing. Microphone permissions requested ...",
    );
    await window.WebVoiceProcessor.WebVoiceProcessor.subscribe(porcupine);

    writeMessage("WebVoiceProcessor ready and listening!");
  } catch (err) {
    porcupineErrorCallback(err);
  }

  try {
    writeMessage("Rhino is loading. Please wait...");
    rhino = await window.RhinoWeb.RhinoWorker.create(
      accessKey,
      rhinoContext,
      rhinoInferenceCallback,
      rhinoModel,
    );

    writeMessage("Rhino worker ready!");
    writeMessage(rhino.contextInfo);
  } catch (error) {
    writeMessage(error);
  }

}
