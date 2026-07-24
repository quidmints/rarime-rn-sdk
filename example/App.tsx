import { Button, ScrollView, Text, TextInput, View } from "react-native";
import React from "react";
import {
  generateQueryProof,
  getProposalInfo,
  isAlreadyVoted,
  liteRegistration,
  submitVote,
  validate,
} from "./src";

export default function App() {
  const [busy, setBusy] = React.useState(false);
  const [proposalId, setProposalId] = React.useState("");

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>Module API Example</Text>
        <Button
          title="lite register"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const txHash = await liteRegistration();
              console.log("txHash", txHash);
              setBusy(false);
            } catch (e) {
              console.error(e);
              alert("Error: " + (e as Error).message);
              setBusy(false);
            }
          }}
        />

        <Button
          title="generate query proof"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const queryProof = await generateQueryProof();
              console.log("queryProof", queryProof);
              setBusy(false);
            } catch (e) {
              console.error(e);
              alert("Error: " + (e as Error).message);
              setBusy(false);
            }
          }}
        />
        <TextInput
          value={proposalId}
          onChangeText={setProposalId}
          placeholder="Enter your proposal id here"
          editable={!busy}
        />
        <Button
          title="Get proposal data"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const pollsData = await getProposalInfo(proposalId);
              console.log("pollsData", pollsData);
              setBusy(false);
            } catch (e) {
              console.error(e);
              alert("Error: " + (e as Error).message);
              setBusy(false);
            }
          }}
        />
        <Button
          title="is Already voted"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const alreadyVoted = await isAlreadyVoted(proposalId);
              console.log("isAlreadyVoted", alreadyVoted);
              setBusy(false);
            } catch (e) {
              console.error(e);
              alert("Error: " + (e as Error).message);
              setBusy(false);
            }
          }}
        />
        <Button
          title="Validate"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              const isValid = await validate(proposalId);
              console.log("validate", isValid);
              setBusy(false);
            } catch (e) {
              console.error(e);
              alert("Error: " + (e as Error).message);
              setBusy(false);
            }
          }}
        />
        <Button
          title="Submit Vote"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await submitVote(proposalId);
              console.log("send vote is successful");
              setBusy(false);
            } catch (e) {
              console.error(e);
              alert("Error: " + (e as Error).message);
              setBusy(false);
            }
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = {
  header: {
    fontSize: 30,
    margin: 20,
  },
  groupHeader: {
    fontSize: 20,
    marginBottom: 20,
  },
  group: {
    margin: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: "#eee",
  },
  view: {
    flex: 1,
    height: 200,
  },
};
