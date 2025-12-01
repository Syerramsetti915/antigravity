import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChakraProvider, Box, VStack, Heading, Text, Input, Button, Image, useToast,
  Flex, Divider, IconButton, HStack, useColorModeValue, Avatar
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ChatIcon, AttachmentIcon, ArrowForwardIcon } from '@chakra-ui/icons';
import umesLogo from './umes_logo.png';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8008';

// Helper function to resize and compress image preview
const compressImagePreview = (dataUrl, maxWidth = 200) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const aspectRatio = img.width / img.height;

      const newWidth = Math.min(maxWidth, img.width);
      const newHeight = newWidth / aspectRatio;

      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Lower quality for storage but still looks decent
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
      resolve(compressedDataUrl);
    };
    img.src = dataUrl;
  });
};

// Chat message bubble component
const MessageBubble = ({ isUser, content, image, timestamp }) => {
  const bg = isUser ? '#822433' : 'white'; // UMES Maroon for user
  const color = isUser ? 'white' : 'gray.800';
  const align = isUser ? 'flex-end' : 'flex-start';
  const borderRadius = isUser ? '20px 20px 0 20px' : '20px 20px 20px 0';
  const shadow = 'md';

  return (
    <VStack align={align} spacing={1} maxW="80%" alignSelf={align} mb={4}>
      <Box
        bg={bg}
        color={color}
        px={5}
        py={3}
        borderRadius={borderRadius}
        boxShadow={shadow}
        position="relative"
      >
        {image && (
          <Image
            src={image}
            alt="Uploaded content"
            maxH="200px"
            borderRadius="md"
            mb={2}
            border="2px solid white"
          />
        )}
        <Text fontSize="md" whiteSpace="pre-wrap">{content}</Text>
      </Box>
      <Text fontSize="xs" color="gray.400" px={1}>
        {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      </Text>
    </VStack>
  );
};

const ResponseBubble = ({ content, timestamp }) => {
  return (
    <VStack align="flex-start" spacing={1} maxW="90%" alignSelf="flex-start" mb={6}>
      <HStack spacing={2} align="center" mb={1}>
        <Avatar
          size="sm"
          src={umesLogo}
          name="UMES AI"
          bg="transparent"
          border="1px solid #E2E8F0"
        />
        <Text fontSize="sm" fontWeight="bold" color="gray.600">UMES Botanical Scholar</Text>
      </HStack>
      <Box
        bg="white"
        color="gray.800"
        px={6}
        py={4}
        borderRadius="0 20px 20px 20px"
        boxShadow="md"
        border="1px solid"
        borderColor="gray.100"
        width="100%"
      >
        <ReactMarkdown
          components={{
            p: ({ node, ...props }) => <Text mb={3} lineHeight="tall" {...props} />,
            ul: ({ node, ...props }) => <Box as="ul" pl={4} mb={3} {...props} />,
            li: ({ node, ...props }) => <Box as="li" mb={1} {...props} />,
            h1: ({ node, ...props }) => <Heading size="md" mb={2} mt={4} color="#822433" {...props} />,
            h2: ({ node, ...props }) => <Heading size="sm" mb={2} mt={3} color="#822433" {...props} />,
            h3: ({ node, ...props }) => <Text fontWeight="bold" mb={1} mt={2} {...props} />,
            strong: ({ node, ...props }) => <Text as="span" fontWeight="bold" color="#822433" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </Box>
      <Text fontSize="xs" color="gray.400" px={1}>
        {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
      </Text>
    </VStack>
  );
};

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [systemInstructions, setSystemInstructions] = useState(
    "You are a distinguished scholar in botanical sciences. Your job is to identify plants from images and provide detailed, scientific, and practical information about them. You can also answer general botanical questions without an image. If the user asks a question without an image, answer it to the best of your botanical knowledge. If the image is not a plant, politely explain that your expertise is limited to botany."
  );
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [messages, setMessages] = useState([]);
  const [currentTimestamp, setCurrentTimestamp] = useState(new Date());
  const [prompt, setPrompt] = useState('');
  const fileInputRef = useRef(null);

  // Load conversations from localStorage and update their names if necessary
  useEffect(() => {
    const loadSavedConversations = async () => {
      try {
        const savedConversations = localStorage.getItem('imageAnalysisConversations');
        if (savedConversations) {
          console.log("Loading saved conversations from localStorage");
          const parsedConversations = JSON.parse(savedConversations);

          // Update conversation names to use the first user message if available
          const updatedConversations = parsedConversations.map(conversation => {
            if (conversation.messages && conversation.messages.length > 0) {
              // Find the first user message
              const firstUserMessage = conversation.messages.find(msg => msg.isUser);
              if (firstUserMessage) {
                return {
                  ...conversation,
                  name: firstUserMessage.content
                };
              }
            }
            return conversation;
          });

          setConversations(updatedConversations);
          console.log(`Successfully loaded ${updatedConversations.length} conversations`);
        } else {
          console.log("No saved conversations found in localStorage");
        }
      } catch (error) {
        console.error('Error loading saved conversations:', error);
        toast({
          title: 'Error loading history',
          description: 'Your chat history could not be loaded.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    };

    loadSavedConversations();
  }, [toast]);

  // Save conversations to localStorage helper
  const saveConversationsToStorage = (updatedConversations) => {
    try {
      localStorage.setItem('imageAnalysisConversations', JSON.stringify(updatedConversations));
    } catch (error) {
      console.error('Error saving conversations:', error);
      // If quota exceeded, try to remove oldest and save again
      if (updatedConversations.length > 1) {
        const reduced = updatedConversations.slice(0, -1);
        saveConversationsToStorage(reduced);
        setConversations(reduced); // Update state to match storage
      } else {
        // Can't save even one conversation
        toast({
          title: 'History Full',
          description: 'Could not save chat history. Storage is full.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    setImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = async () => {
      const fullPreview = reader.result;
      setPreview(fullPreview);
    };
    reader.readAsDataURL(file);

    // Set current timestamp for the new message
    setCurrentTimestamp(new Date());
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1
  });

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
        // Update current timestamp for the new message
        setCurrentTimestamp(new Date());
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!image && !prompt) {
      toast({
        title: 'No input provided',
        description: 'Please upload an image or type a prompt',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Default instructions if the user doesn't provide any text
    const instructions = prompt || "Analyze this image and tell me what you see.";

    // Create a new user message
    const newUserMessage = {
      isUser: true,
      content: instructions,
      image: preview,
      timestamp: new Date()
    };

    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setLoading(true);

    try {
      const formData = new FormData();
      if (image) {
        formData.append('image', image);
      }
      // Send the user's prompt (or empty string if none)
      formData.append('prompt', prompt || '');
      // Send the system instructions (persona)
      formData.append('system_instructions', systemInstructions);

      // Send chat history (exclude current message which is prompt/image)
      // We send the existing 'messages' state which contains previous turns
      // IMPORTANT: Strip images from history to avoid huge payloads. Text context is usually enough.
      if (messages.length > 0) {
        const historyMessages = messages.map(msg => ({
          isUser: msg.isUser,
          content: msg.content,
          // We intentionally omit 'image' to keep the payload small and text-focused for context
        }));
        console.log("Sending history:", historyMessages);
        formData.append('history', JSON.stringify(historyMessages));
      }

      const result = await axios.post(`${API_URL}/analyze-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      let responseText = '';

      if (result.data.error) {
        console.error('Backend returned error:', result.data.error);
        responseText = `Error: ${result.data.error}\n\nTraceback: ${result.data.traceback || 'No traceback available'}`;
        toast({
          title: 'Analysis Error',
          description: result.data.error || 'Error during image analysis',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        responseText = result.data.response;
      }

      setResponse(responseText);

      // Create a new AI response message
      const responseTimestamp = new Date();
      const newAIMessage = {
        isUser: false,
        content: responseText,
        timestamp: responseTimestamp
      };

      const updatedMessages = [...messages, newUserMessage, newAIMessage];
      setMessages(updatedMessages);

      // Compress the preview before storing
      try {
        let compressedPreview = null;
        if (preview) {
          try {
            compressedPreview = await compressImagePreview(preview);
          } catch (e) {
            console.error("Compression failed", e);
          }
        }

        // Save this conversation with the initial message as the title
        const timestamp = new Date();

        const newConversation = {
          id: timestamp.getTime().toString(),
          name: instructions, // Use the first message/question as the conversation name
          timestamp: timestamp,
          imagePreview: compressedPreview, // Use compressed preview
          systemInstructions: instructions,
          response: responseText,
          messages: updatedMessages // Store the full chat history
        };

        const newConversations = [newConversation, ...conversations];
        setConversations(newConversations);
        saveConversationsToStorage(newConversations);

        // Clear the image and preview after successful submission
        setImage(null);
        setPreview(null);
        setPrompt(''); // Also clear the prompt input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

      } catch (error) {
        console.error('Error processing history:', error);
      }

    } catch (error) {
      console.error('Error analyzing image:', error);
      let errorMessage = 'Failed to analyze image';

      if (error.response) {
        // Server responded with a non-2xx status
        console.error('Server error:', error.response.data);
        errorMessage = error.response.data.error || error.response.data.detail || 'Server error';

        // If errorMessage is an object (like Pydantic validation error), stringify it
        if (typeof errorMessage === 'object') {
          errorMessage = JSON.stringify(errorMessage, null, 2);
        }

        const traceback = error.response.data.traceback;
        const fullErrorContent = traceback
          ? `Error: ${errorMessage}\n\nTraceback: ${traceback}`
          : `Error: ${errorMessage}`;

        setResponse(fullErrorContent);

        // Add error message as AI response
        const errorResponse = {
          isUser: false,
          content: fullErrorContent,
          timestamp: new Date()
        };
        setMessages(prevMessages => [...prevMessages, errorResponse]);
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Check if the backend is running.';

        // Add error message as AI response
        const errorResponse = {
          isUser: false,
          content: errorMessage,
          timestamp: new Date()
        };
        setMessages(prevMessages => [...prevMessages, errorResponse]);
      } else {
        // Request setup error
        errorMessage = error.message;

        // Add error message as AI response
        const errorResponse = {
          isUser: false,
          content: errorMessage,
          timestamp: new Date()
        };
        setMessages(prevMessages => [...prevMessages, errorResponse]);
      }

      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);

      // Clear the input field and optionally the image after sending regardless of success or failure
      setPrompt('');

      // Uncomment the following if you want the image to also clear after sending
      // if (image) {
      //   setImage(null);
      //   setPreview(null);
      // }
    }
  };

  const resetForm = () => {
    setImage(null);
    setPreview(null);
    setResponse('');
    setCurrentConversationId(null);
    setMessages([]);
    setSystemInstructions("You are a distinguished scholar in botanical sciences. Your job is to identify plants from images and provide detailed, scientific, and practical information about them. You can also answer general botanical questions without an image. If the user asks a question without an image, answer it to the best of your botanical knowledge. If the image is not a plant, politely explain that your expertise is limited to botany.");
  };

  const createNewChat = () => {
    resetForm();
  };

  const loadConversation = (conversation) => {
    setCurrentConversationId(conversation.id);
    setSystemInstructions(conversation.systemInstructions);
    setPreview(conversation.imagePreview);
    setResponse(conversation.response);

    // Load stored messages if available, otherwise create default messages
    if (conversation.messages && conversation.messages.length > 0) {
      setMessages(conversation.messages);
    } else {
      // Create default messages from the stored data
      const userMessage = {
        isUser: true,
        content: conversation.systemInstructions,
        image: conversation.imagePreview,
        timestamp: conversation.timestamp
      };

      const aiMessage = {
        isUser: false,
        content: conversation.response,
        timestamp: new Date(conversation.timestamp.getTime() + 1000) // 1 second later
      };

      setMessages([userMessage, aiMessage]);
    }

    // We can't restore the actual image File object from storage
    setImage(null);
  };

  const deleteConversation = (id, e) => {
    e.stopPropagation();
    const updatedConversations = conversations.filter(convo => convo.id !== id);
    setConversations(updatedConversations);
    saveConversationsToStorage(updatedConversations);
    if (currentConversationId === id) {
      resetForm();
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  const sidebarBg = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const mainBg = useColorModeValue('gray.50', 'gray.800');
  const chatBg = useColorModeValue('white', 'gray.700');

  return (
    <ChakraProvider>
      <Flex height="100vh">
        {/* Chat History Sidebar */}
        {showSidebar && (
          <Box
            width="300px"
            bg={sidebarBg}
            p={4}
            borderRightWidth={1}
            borderColor={borderColor}
            height="100%"
            overflowY="auto"
          >
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Heading size="md">Chat History</Heading>
                <IconButton
                  icon={<AddIcon />}
                  size="sm"
                  onClick={createNewChat}
                  aria-label="New chat"
                />
              </HStack>

              <Divider />

              {conversations.length === 0 ? (
                <Text color="gray.500" py={4} textAlign="center">
                  No conversations yet
                </Text>
              ) : (
                conversations.map(conversation => (
                  <Box
                    key={conversation.id}
                    p={3}
                    borderWidth={1}
                    borderRadius="md"
                    borderColor={conversation.id === currentConversationId ? "blue.500" : borderColor}
                    bg={conversation.id === currentConversationId ? "blue.50" : "transparent"}
                    cursor="pointer"
                    onClick={() => loadConversation(conversation)}
                    position="relative"
                  >
                    <HStack justify="space-between">
                      <Box>
                        <Text fontWeight="medium" noOfLines={1}>
                          {conversation.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(conversation.timestamp).toLocaleTimeString()}
                        </Text>
                      </Box>
                      <IconButton
                        icon={<DeleteIcon />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        aria-label="Delete conversation"
                        onClick={(e) => deleteConversation(conversation.id, e)}
                      />
                    </HStack>
                  </Box>
                ))
              )}
            </VStack>
          </Box>
        )}

        {/* Main Content */}
        <Box flex="1" display="flex" flexDirection="column" height="100%" bg="#F7FAFC">
          {/* Header */}
          <Box
            px={6}
            py={4}
            bg="white"
            boxShadow="sm"
            borderBottom="1px solid"
            borderColor="gray.100"
            zIndex={10}
          >
            <HStack justify="space-between" align="center">
              <HStack spacing={4}>
                <Image src={umesLogo} h="50px" alt="UMES Logo" />
                <VStack align="flex-start" spacing={0}>
                  <Heading as="h1" size="md" color="#822433" letterSpacing="wide">
                    UMES EXTENSION
                  </Heading>
                  <Text fontSize="xs" fontWeight="bold" color="gray.500" letterSpacing="widest">
                    BOTANICAL AI ASSISTANT
                  </Text>
                </VStack>
              </HStack>
              <IconButton
                icon={<ChatIcon />}
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
                variant="ghost"
                color="#822433"
              />
            </HStack>
          </Box>

          {/* Chat Messages Area */}
          <Box flex="1" overflowY="auto" p={4} display="flex" flexDirection="column">
            {messages.length > 0 ? (
              messages.map((msg, index) =>
                msg.isUser ? (
                  <MessageBubble
                    key={index}
                    isUser={true}
                    content={msg.content}
                    image={msg.image}
                    timestamp={msg.timestamp}
                  />
                ) : (
                  <ResponseBubble
                    key={index}
                    content={msg.content}
                    timestamp={msg.timestamp}
                  />
                )
              )
            ) : (
              <VStack spacing={4} justifyContent="center" height="100%" opacity={0.6}>
                <Text>Start a new conversation by uploading an image</Text>
              </VStack>
            )}
          </Box>

          {/* New Simplified Input Area */}
          <Box p={6} bg="#F7FAFC">
            <Box
              bg="white"
              p={2}
              borderRadius="2xl"
              boxShadow="lg"
              border="1px solid"
              borderColor="gray.100"
            >
              <HStack spacing={2} align="flex-end">
                <IconButton
                  aria-label="Attach image"
                  icon={<AttachmentIcon boxSize={5} />}
                  onClick={() => fileInputRef.current.click()}
                  color="#822433"
                  variant="ghost"
                  borderRadius="full"
                  size="lg"
                  isLoading={loading}
                  _hover={{ bg: 'gray.50' }}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />

                <Box flex={1} py={2}>
                  <Input
                    placeholder="Ask about a plant or upload an image..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    variant="unstyled"
                    size="lg"
                    px={2}
                    fontSize="md"
                  />

                  {preview && (
                    <Box position="relative" width="60px" height="60px" mt={2} ml={2}>
                      <Image
                        src={preview}
                        alt="Preview"
                        objectFit="cover"
                        width="60px"
                        height="60px"
                        borderRadius="lg"
                        border="2px solid #822433"
                      />
                      <IconButton
                        aria-label="Remove image"
                        icon={<DeleteIcon />}
                        size="xs"
                        position="absolute"
                        top="-8px"
                        right="-8px"
                        bg="red.500"
                        color="white"
                        borderRadius="full"
                        _hover={{ bg: 'red.600' }}
                        onClick={() => {
                          setImage(null);
                          setPreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                      />
                    </Box>
                  )}
                </Box>

                <IconButton
                  aria-label="Send message"
                  icon={<ArrowForwardIcon boxSize={6} />}
                  onClick={handleSubmit}
                  bg="#822433"
                  color="white"
                  borderRadius="full"
                  size="lg"
                  isLoading={loading}
                  _hover={{ bg: '#6b1d2a' }}
                  disabled={!prompt && !image}
                  mb={1}
                />
              </HStack>
            </Box>
          </Box>
        </Box>
      </Flex>
    </ChakraProvider>
  );
}

export default App; 