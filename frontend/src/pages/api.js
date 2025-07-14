import axios from "axios";

const API_URL = "http://127.0.0.1:5000"; 

export const signup = async (formData) => {
  try {
    const response = await axios.post(`${API_URL}/signup`, formData);
    return response.data;
  } catch (error) {
    return error.response ? error.response.data : { error: "Network error" };
  }
};

export const signin = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/signin`, { email, password });
    return response.data;
  } catch (error) {
    return error.response ? error.response.data : { error: "Network error" };
  }
};

export const checkAvailability = async (data) => {
  try {
    const response = await fetch(`${API_URL}/check-availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("Error checking availability:", error);
    return {};
  }
};
