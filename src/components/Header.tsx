import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  showSearch?: boolean;
  onSearchPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showLogo = true, 
  showSearch = true,
  onSearchPress 
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {showLogo ? (
        <Text style={styles.logo}>AniStream</Text>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      {showSearch && (
        <TouchableOpacity onPress={onSearchPress} style={styles.searchButton}>
          <MaterialIcons name="search" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  logo: {
    color: '#E50914',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  searchButton: {
    padding: 4,
  },
});

export default Header;

