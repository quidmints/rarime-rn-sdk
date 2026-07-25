package expo.modules.rnnoir

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.noirandroid.lib.Circuit
import androidx.core.net.toUri
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class RnNoirModule : Module() {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('RnNoir')` in JavaScript.
    Name("RnNoir")

    /**
     * Generates a PLONK proof using the Noir circuit.
     *
     * @param trustedSetupUri URI pointing to the SRS file (e.g. file://...)
     * @param inputsJson JSON string representing a map of witness values
     * @param manifestJson JSON manifest for the circuit bytecode
     * @return A hex string representing the generated proof
     * @throws IllegalArgumentException if the URI is invalid
     * @throws Exception if proof generation fails
     */
    AsyncFunction("provePlonk") { trustedSetupUri: String, inputsJson: String, manifestJson: String ->
      val rawPath = trustedSetupUri.toUri().path
        ?: throw IllegalArgumentException("Invalid URI: $trustedSetupUri")

      val circuit = Circuit.fromJsonManifest(manifestJson).apply {
        setupSrs(rawPath, false)
      }

      val type = object : TypeToken<Map<String, Any>>() {}.type
      val inputsMap: Map<String, Any> = Gson().fromJson(inputsJson, type)

      val proof = circuit.prove(
        inputsMap,
        proofType = "plonk",
        recursive = false
      )

      return@AsyncFunction proof.proof
    }

    /**
     * Generates an UltraHonk proof using the Noir circuit.
     *
     * Added 2026-07-25: the underlying `Circuit.prove` binding already accepts "honk" as a
     * `proofType` value (confirmed directly in the vendored native module's compiled bytecode -
     * `strings` on Circuit.class's constant pool shows "honk" alongside "prove"/"proofType"/
     * "recursive" - not assumed from documentation). No native rebuild or dependency bump was
     * needed for this; `provePlonk` above and this function call the exact same already-vendored
     * `noir.aar`, just with a different `proofType` argument. This is what
     * ibiza/frontend/identity-wallet's `withdraw_identity`/`title_holder` circuits (Noir/Honk,
     * not Plonk) need to actually generate proofs on-device.
     *
     * @param trustedSetupUri URI pointing to the SRS file (e.g. file://...)
     * @param inputsJson JSON string representing a map of witness values
     * @param manifestJson JSON manifest for the circuit bytecode
     * @return A hex string representing the generated proof
     * @throws IllegalArgumentException if the URI is invalid
     * @throws Exception if proof generation fails
     */
    AsyncFunction("proveHonk") { trustedSetupUri: String, inputsJson: String, manifestJson: String ->
      val rawPath = trustedSetupUri.toUri().path
        ?: throw IllegalArgumentException("Invalid URI: $trustedSetupUri")

      val circuit = Circuit.fromJsonManifest(manifestJson).apply {
        setupSrs(rawPath, false)
      }

      val type = object : TypeToken<Map<String, Any>>() {}.type
      val inputsMap: Map<String, Any> = Gson().fromJson(inputsJson, type)

      val proof = circuit.prove(
        inputsMap,
        proofType = "honk",
        recursive = false
      )

      return@AsyncFunction proof.proof
    }
  }
}
