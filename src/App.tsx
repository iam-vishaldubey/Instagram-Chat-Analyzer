import React, { useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Pie } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import {
  Chart as BarChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip as BarTooltip,
  Legend as BarLegend,
  ChartOptions as BarChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { UploadInput } from "./components/UploadInput";
import utf8 from "utf8"; // Import the utf8 package
import "./styles.css";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);
BarChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  BarTooltip,
  BarLegend
);

interface Message {
  sender_name: string;
  content: string;
  timestamp_ms?: number; // Changed to timestamp_ms
}

interface UserMessages {
  [user: string]: Message[];
}

const decodeUnicode = (unicodeString: string): string => {
  if (!unicodeString) return "";

  // Convert unicode escape sequences to a byte string
  const byteString = unicodeString.replace(
    /\\u([0-9a-fA-F]{4})/g,
    (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }
  );

  // Decode the byte string to UTF-8
  return utf8.decode(byteString);
};

const formatTimestamp = (timestamp_ms: number): string => {
  const date = new Date(timestamp_ms);
  return date.toLocaleString(); // Adjust format as needed
};

const filterMessages = (messages: Message[]): Message[] => {
  return messages
    .map((msg) => ({
      ...msg,
      content: msg.content.trim(),
    }))
    .filter(
      (msg) =>
        msg.content &&
        !msg.content.toLowerCase().includes("liked a message") &&
        !msg.content.toLowerCase().includes("attachment") &&
        !msg.content.toLowerCase().includes("like") &&
        !/[^\u0000-\u007F]/.test(msg.content) // Check for non-ASCII characters (emojis)
    );
};

const getTopMessages = (
  messages: Message[]
): { labels: string[]; datasets: any[] } => {
  const filteredMessages = filterMessages(messages);
  const messageCounts: { [message: string]: number } = {};

  filteredMessages.forEach((msg) => {
    messageCounts[msg.content] = (messageCounts[msg.content] || 0) + 1;
  });

  const sortedMessages = Object.entries(messageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);

  return {
    labels: sortedMessages.map(([message]) => message),
    datasets: [
      {
        label: "Message Frequency",
        data: sortedMessages.map(([, count]) => count),
        backgroundColor: [
          "#ff6384",
          "#36a2eb",
          "#cc65fe",
          "#ffce56",
          "#00a8b5",
          "#ff9f40",
          "#4bc0c0",
        ],
        borderColor: "#000000",
        borderWidth: 1,
      },
    ],
  };
};

const getSortedMessagesAscending = (messages: Message[]): Message[] => {
  return messages
    .filter((msg) => msg.timestamp_ms) // Filter out messages without a timestamp
    .sort((a, b) => a.timestamp_ms! - b.timestamp_ms!); // Sort by ascending timestamp
};

const getLatestMessages = (messages: Message[], count: number): Message[] => {
  const sortedMessages = getSortedMessagesAscending(messages);
  return sortedMessages.slice(-count); // Get latest messages (most recent)
};

const getEarliestMessages = (messages: Message[], count: number): Message[] => {
  const sortedMessages = getSortedMessagesAscending(messages);
  return sortedMessages.slice(0, count); // Get earliest messages (oldest)
};

const MessageList: React.FC<{ messages: Message[]; title: string }> = ({
  messages,
  title,
}) => (
  <div className="message-list">
    <h2>{title}</h2>
    <div className="message-container">
      {messages.length > 0 ? (
        messages.map((msg, index) => (
          <div
            key={index}
            className={`message-wrapper ${
              msg.sender_name === "You" ? "you" : "other"
            }`}
          >
            <div
              className={`message-bubble ${
                msg.sender_name === "You" ? "you" : "other"
              }`}
            >
              <strong>{msg.sender_name}</strong>
              <div>{msg.content}</div>
            </div>
            <small className="timestamp">
              {formatTimestamp(msg.timestamp_ms!)}
            </small>
          </div>
        ))
      ) : (
        <div>No messages to display</div>
      )}
    </div>
  </div>
);

const App: React.FC = () => {
  const [data, setData] = useState<UserMessages | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const messages = json.messages as Message[];
          const userMessages: UserMessages = {};

          messages.forEach((msg) => {
            // Check if content and sender_name are defined and are strings
            const content = msg.content || "";
            const senderName = msg.sender_name || "";

            try {
              const decodedContent = utf8.decode(content);
              const decodedSenderName = utf8.decode(senderName);

              if (!userMessages[decodedSenderName]) {
                userMessages[decodedSenderName] = [];
              }

              userMessages[decodedSenderName].push({
                ...msg,
                content: decodedContent,
                sender_name: decodedSenderName,
              });
            } catch (decodeError) {
              console.error(
                "Error decoding message or sender name:",
                decodeError
              );
            }
          });

          setData(userMessages);
        } catch (error) {
          console.error("Error parsing JSON file:", error);
        }
      };

      reader.readAsText(file);
    }
  };

  const getChartData = () => {
    if (!data) return { labels: [], datasets: [] };

    const userLabels = Object.keys(data);
    const messageCounts = userLabels.map((user) => ({
      user,
      count: data[user].length,
    }));

    // Sort users by message count in descending order and take the top 7
    const topUsers = messageCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    return {
      labels: topUsers.map((user) => user.user),
      datasets: [
        {
          label: "Number of Messages",
          data: topUsers.map((user) => user.count),
          backgroundColor: [
            "#ff6384",
            "#36a2eb",
            "#cc65fe",
            "#ffce56",
            "#00a8b5",
            "#ff9f40",
            "#4bc0c0",
          ],
          borderColor: "#000000",
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions: ChartOptions<"pie"> = {
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => ` ${tooltipItem.label}: ${tooltipItem.raw}`,
        },
      },
      datalabels: {
        color: "#ffffff", // Color of the labels
        formatter: (value) => `${value}`, // Only show the value
        anchor: "end", // Position inside the arc
        align: "start",
        offset: 10, // Adjust the offset as needed
      },
    },
    hover: {
      mode: "nearest",
      intersect: true,
    },
    animation: {
      animateRotate: true,
      animateScale: true,
    },
    elements: {
      arc: {
        borderWidth: 1,
        borderColor: "#000000", // Consistent border color
        hoverOffset: 20, // Increased offset for a larger pop-up effect
      },
    },
  };

  const barChartOptions: BarChartOptions<"bar"> = {
    maintainAspectRatio: false,
    responsive: true,
    indexAxis: "y", // Horizontal bar chart
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => ` ${tooltipItem.label}: ${tooltipItem.raw}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  const allMessages = data ? Object.values(data).flat() : [];
  const latestMessages = getLatestMessages(allMessages, 4);
  const earliestMessages = getEarliestMessages(allMessages, 4);

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#141414",
        color: "#f0f0f0",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#00ff99" }}>Instagram Chat Analyzer</h1>
      <UploadInput onFileUpload={handleFileUpload} />
      {data && (
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            flexDirection: "row",
            maxWidth: "100%",
            overflowX: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: "600px", flexShrink: 0 }}>
            <h2>Biggest Yapper</h2>
            <div style={{ position: "relative", height: "400px" }}>
              <Pie data={getChartData()} options={chartOptions} />
            </div>
          </div>
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              flexShrink: 0,
              marginLeft: "20px",
            }}
          >
            <h2>Top 7 Most Used Messages</h2>
            <div style={{ position: "relative", height: "400px" }}>
              <Bar
                data={getTopMessages(allMessages)}
                options={barChartOptions}
              />
            </div>
          </div>
        </div>
      )}
      {data && (
        <div
          style={{ display: "flex", flexDirection: "row", marginTop: "20px" }}
        >
          <div style={{ width: "100%", maxWidth: "600px", flexShrink: 0 }}>
            <MessageList messages={latestMessages} title="Latest 4 Messages" />
          </div>
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              flexShrink: 0,
              marginLeft: "20px",
            }}
          >
            <MessageList
              messages={earliestMessages}
              title="Earliest 4 Messages"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
